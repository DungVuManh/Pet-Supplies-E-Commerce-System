import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import {
  ALLOWED_RETURN_IMAGE_MIME_TYPES,
  uploadImageBuffersToCloudinary,
} from "../common/cloudinary-upload.js";
import {
  getReturnCompletionDate,
  getReturnEligibilityError,
  returnConflict,
  serializeReturnRequest,
} from "../common/order-return.js";
import { applyReturnOperation, loadOrderForReturn } from "../common/order-return-operations.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ReturnRequest } from "../models/return-request.model.js";
import {
  parseCustomerReturnRequest,
  parseStaffReturnDecision,
  parseStaffReturnQuery,
} from "../validators/order-return.validator.js";
import { parseOrderId } from "../validators/order.validator.js";

const shippingDeadlineMs = 3 * 24 * 60 * 60 * 1000;

function returnNotFound() {
  return new AppError("Không tìm thấy yêu cầu hoàn trả.", 404, "RETURN_NOT_FOUND");
}

async function loadCustomerOrder(request) {
  const id = parseOrderId({ id: request.params.id });
  const order = await loadOrderForReturn({
    _id: id,
    customerId: request.user._id,
    channel: "online",
    creationState: { $ne: "pending" },
  });
  if (!order) throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  return order;
}

function verifyReturnEligibility(order, now, reason) {
  const error = getReturnEligibilityError(order, now, reason);
  if (error) throw error;
}

export async function uploadCustomerReturnImages(request, response) {
  const order = await loadCustomerOrder(request);
  verifyReturnEligibility(order);

  const files = request.files;
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError("Vui lòng chọn ít nhất 1 ảnh để tải lên.", 400, "NO_FILES");
  }
  if (files.length > 5) {
    throw new AppError("Chỉ được tải lên tối đa 5 ảnh cho mỗi yêu cầu.", 400, "TOO_MANY_FILES");
  }
  for (const file of files) {
    if (!ALLOWED_RETURN_IMAGE_MIME_TYPES.includes(file?.mimetype)) {
      throw new AppError("Chỉ chấp nhận hình ảnh định dạng JPG, PNG hoặc WEBP.", 400, "INVALID_FILE_TYPE");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new AppError("Mỗi hình ảnh không được vượt quá 5MB.", 400, "FILE_TOO_LARGE");
    }
  }

  const urls = await uploadImageBuffersToCloudinary(files, { folder: "petjoy/returns", maxFiles: 5 });
  response.json({ success: true, data: { urls } });
}

export async function submitCustomerReturnRequest(request, response) {
  const payload = parseCustomerReturnRequest(request.body);
  const order = await loadCustomerOrder(request);
  const now = new Date();
  verifyReturnEligibility(order, now, payload.reason);
  const completedAt = getReturnCompletionDate(order);
  const entry = await applyReturnOperation(order, {
    requestId: new mongoose.Types.ObjectId(),
    fields: {
      ...payload,
      requestedBy: request.user._id,
      requestedAt: now,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
  }, completedAt ? { returnWindowCompletedAt: completedAt } : {});
  response.status(201).json({ success: true, data: { returnRequest: serializeReturnRequest(entry) } });
}

async function loadCustomerReturn(request, requestId) {
  const order = await loadCustomerOrder(request);
  const entry = await ReturnRequest.findOne({ _id: requestId, orderId: order._id }).lean();
  if (!entry) throw returnNotFound();
  return { order, entry };
}

export async function listCustomerReturns(request, response) {
  const order = await loadCustomerOrder(request);
  const { page, pageSize } = parseStaffReturnQuery({ page: request.query.page, pageSize: request.query.pageSize });
  const filter = { orderId: order._id };
  const [items, totalItems] = await Promise.all([
    ReturnRequest.find(filter)
      .select("reason status requestedAt cancelledAt")
      .sort({ requestedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ReturnRequest.countDocuments(filter),
  ]);
  response.json({ success: true, data: {
    items: items.map(({ _id, ...item }) => ({ requestId: String(_id), ...item })),
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) || 1 },
  } });
}

export async function getCustomerReturnDetail(request, response) {
  const requestId = parseOrderId({ id: request.params.requestId });
  const { entry } = await loadCustomerReturn(request, requestId);
  response.json({ success: true, data: { returnRequest: serializeReturnRequest(entry) } });
}

function transitionReturn({ order, entry, fields, orderFields, orderHistory, audit }) {
  if (String(order.latestReturn?.requestId) !== String(entry._id) || order.latestReturn.status !== entry.status) {
    throw returnConflict();
  }
  return applyReturnOperation(order, { requestId: entry._id, fromStatus: entry.status, fields, orderFields, orderHistory, audit });
}

export async function cancelCustomerReturn(request, response) {
  const requestId = parseReturnActionId(request);
  const { order, entry } = await loadCustomerReturn(request, requestId);
  if (entry.status === "cancelled") {
    response.json({ success: true, data: { returnRequest: serializeReturnRequest(entry) } });
    return;
  }
  if (!["pending", "approved"].includes(entry.status) || !["shipping", "completed"].includes(order.orderStatus)) throw returnConflict();
  const updated = await transitionReturn({ order, entry, fields: { status: "cancelled", cancelledAt: new Date() } });
  response.json({ success: true, data: { returnRequest: serializeReturnRequest(updated) } });
}

function parseReturnActionId(request) {
  const requestId = request.body?.requestId;
  if (typeof requestId !== "string" || !/^[a-f\d]{24}$/i.test(requestId)) {
    throw new AppError("Vui lòng tải lại đơn hàng để lấy mã yêu cầu hoàn trả.", 409, "RETURN_CONFLICT");
  }
  return requestId;
}

export async function confirmCustomerReturnShipped(request, response) {
  const requestId = parseReturnActionId(request);
  const { order, entry } = await loadCustomerReturn(request, requestId);
  if (entry.status !== "approved" || !["shipping", "completed"].includes(order.orderStatus)) throw returnConflict();
  const now = new Date();
  if (entry.approvedAt && now - entry.approvedAt > shippingDeadlineMs) {
    throw new AppError("Yêu cầu hoàn trả đã quá hạn gửi hàng (3 ngày).", 400, "RETURN_SHIPPING_EXPIRED");
  }
  const updated = await transitionReturn({ order, entry, fields: { status: "customer_shipped", customerShippedAt: now } });
  response.json({ success: true, data: {
    orderId: String(entry.orderId),
    status: updated.status,
    customerShippedAt: updated.customerShippedAt,
    returnRequest: serializeReturnRequest(updated),
  } });
}

function staffCustomer(order, requester) {
  return {
    name: order.shippingAddress?.recipientName || order.guestInfo?.name || requester?.fullName || "Khách hàng",
    phone: order.shippingAddress?.phone || order.guestInfo?.phone || requester?.phone || "",
    email: requester?.email || order.guestInfo?.email || "",
  };
}

export async function listStaffReturns(request, response) {
  const { query, status, page, pageSize } = parseStaffReturnQuery(request.query);
  const filter = status === "all" ? {} : { status };
  if (query) {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const orders = await Order.find({ $or: [
      { orderCode: regex }, { "shippingAddress.recipientName": regex },
      { "shippingAddress.phone": regex }, { "guestInfo.name": regex }, { "guestInfo.phone": regex },
    ] }).select("_id").lean();
    filter.orderId = { $in: orders.map((order) => order._id) };
  }
  const [totalItems, entries, groups] = await Promise.all([
    ReturnRequest.countDocuments(filter),
    ReturnRequest.find(filter).sort({ requestedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize).limit(pageSize)
      .populate("orderId", "orderCode shippingAddress guestInfo total paymentMethod paymentStatus orderStatus")
      .populate("requestedBy", "fullName email phone")
      .lean(),
    ReturnRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const counts = { all: 0, pending: 0, approved: 0, customer_shipped: 0, received: 0, completed: 0, rejected: 0, cancelled: 0 };
  for (const group of groups) {
    counts[group._id] = group.count;
    counts.all += group.count;
  }
  const items = entries.filter((entry) => entry.orderId).map((entry) => {
    const order = entry.orderId;
    return {
      id: String(entry._id),
      orderId: String(order._id),
      orderCode: order.orderCode,
      customer: staffCustomer(order, entry.requestedBy),
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      returnRequest: serializeReturnRequest(entry),
    };
  });
  response.json({ success: true, data: {
    items, counts, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) || 1 },
  } });
}

export async function getStaffReturnDetail(request, response) {
  const id = parseOrderId(request.params);
  const entry = await ReturnRequest.findById(id)
    .populate("requestedBy", "fullName email phone").populate("reviewedBy", "fullName").lean();
  if (!entry) throw returnNotFound();
  const order = await Order.findById(entry.orderId).lean();
  if (!order || order.creationState === "pending") throw returnNotFound();

  const orderItems = order.items || [];
  const products = await Product.find({ _id: { $in: orderItems.map((item) => item.productId).filter(Boolean) } })
    .select("images variants").lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const items = orderItems.map((item) => {
    const product = productMap.get(String(item.productId));
    const variant = product?.variants?.find((variant) => variant.sku === item.variantSku);
    return {
      productId: String(item.productId),
      name: item.name,
      variantSku: item.variantSku,
      unitPrice: item.unitPrice,
      qty: item.qty,
      totalPrice: item.totalPrice ?? item.unitPrice * item.qty,
      image: item.image || variant?.image || product?.images?.[0] || "",
    };
  });
  response.json({ success: true, data: {
    id: String(entry._id),
    orderId: String(order._id),
    orderCode: order.orderCode,
    channel: order.channel,
    customer: staffCustomer(order, entry.requestedBy),
    shippingAddress: order.shippingAddress,
    shipping: order.shipping,
    items,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee || 0,
    discount: order.discount || 0,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    statusHistory: order.statusHistory || [],
    returnRequest: serializeReturnRequest(entry),
  } });
}

const staffTransitions = {
  approve_request: { from: "pending", to: "approved" },
  reject_request: { from: "pending", to: "rejected" },
  receive: { from: "customer_shipped", to: "received" },
  complete_refund: { from: "received", to: "completed" },
  reject_refund: { from: "received", to: "rejected" },
};

async function applyStaffTransition(request, action, payload = {}) {
  const id = parseOrderId(request.params);
  const existing = await ReturnRequest.findById(id).lean();
  if (!existing) throw returnNotFound();
  const order = await loadOrderForReturn({ _id: existing.orderId, channel: "online", creationState: { $ne: "pending" } });
  const { from, to } = staffTransitions[action];
  if (!order || !["shipping", "completed"].includes(order.orderStatus) ||
      order.latestReturn?.status !== from || existing.status !== from) throw returnConflict();

  const staffId = request.user._id;
  const now = new Date();
  const fields = { status: to, reviewedBy: staffId, reviewedAt: now };
  if (action === "approve_request") fields.approvedAt = now;
  if (action === "receive") fields.receivedAt = now;
  if (to === "rejected") fields.rejectionReason = payload.rejectionReason;

  let orderFields;
  let orderHistory;
  if (action === "complete_refund") {
    const refundAmount = payload.refundAmount ?? order.total;
    if (!Number.isSafeInteger(refundAmount) || refundAmount < 0 || refundAmount > order.total) {
      throw new AppError("Số tiền hoàn không hợp lệ.", 400, "VALIDATION_ERROR");
    }
    Object.assign(fields, { completedAt: now, refundAmount, refundRequired: refundAmount > 0,
      refundStatus: refundAmount > 0 ? "refunded" : "none" });
    orderFields = { orderStatus: "returned", paymentStatus: "paid", paidAmount: order.total };
    orderHistory = { from: order.orderStatus, to: "returned", by: staffId, at: now };
  }
  const audit = {
    actorId: staffId,
    action: "order.return." + action,
    target: { collectionName: "returnRequests", id },
    after: { orderId: String(order._id), status: to },
    at: now,
    createdAt: now,
    updatedAt: now,
  };
  return transitionReturn({ order, entry: existing, fields, orderFields, orderHistory, audit });
}

export async function receiveStaffReturn(request, response) {
  const entry = await applyStaffTransition(request, "receive");
  response.json({ success: true, data: { orderId: String(entry.orderId), status: entry.status, receivedAt: entry.receivedAt } });
}

export async function decideStaffReturn(request, response) {
  const payload = parseStaffReturnDecision(request.body);
  const entry = await applyStaffTransition(request, payload.action, payload);
  response.json({ success: true, data: {
    orderId: String(entry.orderId), action: payload.action, decision: payload.decision,
    ...serializeReturnRequest(entry),
    ...(entry.status === "completed" ? { orderStatus: "returned", paymentStatus: "paid" } : {}),
  } });
}
