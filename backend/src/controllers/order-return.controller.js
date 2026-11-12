// =============================================================
// backend/src/controllers/order-return.controller.js
// Quản lý luồng Yêu cầu hoàn trả đơn hàng cho Customer & Staff
// =============================================================

import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import {
  ALLOWED_RETURN_IMAGE_MIME_TYPES,
  uploadImageBuffersToCloudinary,
} from "../common/cloudinary-upload.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { AuditLog } from "../models/audit-log.model.js";
import {
  parseCustomerReturnRequest,
  parseStaffReturnQuery,
  parseStaffReturnDecision,
} from "../validators/order-return.validator.js";
import { parseOrderId } from "../validators/order.validator.js";

// =============================================================
// 1. CUSTOMER RETURN WORKFLOW
// =============================================================

/**
 * POST /api/v1/orders/:id/return/upload
 * Tải lên 1-5 ảnh minh chứng hoàn trả hàng lên Cloudinary
 */
export async function uploadCustomerReturnImages(request, response, next) {
  try {
    const { id } = request.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    const order = await Order.findOne({
      _id: id,
      customerId: request.user._id,
      channel: "online",
      creationState: { $ne: "pending" },
    }).lean();

    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    if (order.orderStatus !== "shipping") {
      throw new AppError(
        "Chỉ có thể yêu cầu hoàn trả khi đơn hàng đang giao.",
        400,
        "INVALID_ORDER_STATUS"
      );
    }

    if (order.returnRequest?.status) {
      throw new AppError(
        "Đơn hàng đã có yêu cầu hoàn trả.",
        409,
        "DUPLICATE_RETURN_REQUEST"
      );
    }

    const files = request.files;
    if (!Array.isArray(files) || files.length === 0) {
      throw new AppError("Vui lòng chọn ít nhất 1 ảnh để tải lên.", 400, "NO_FILES");
    }

    if (files.length > 5) {
      throw new AppError("Chỉ được tải lên tối đa 5 ảnh cho mỗi yêu cầu.", 400, "TOO_MANY_FILES");
    }

    for (const file of files) {
      if (!file?.mimetype || !ALLOWED_RETURN_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        throw new AppError(
          "Chỉ chấp nhận tệp hình ảnh định dạng JPG, PNG hoặc WEBP.",
          400,
          "INVALID_FILE_TYPE"
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new AppError("Mỗi hình ảnh không được vượt quá 5MB.", 400, "FILE_TOO_LARGE");
      }
    }

    const urls = await uploadImageBuffersToCloudinary(files, {
      folder: "petjoy/returns",
      maxFiles: 5,
    });

    response.set("Cache-Control", "no-store");
    response.json({
      success: true,
      data: { urls },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/orders/:id/return
 * Gửi yêu cầu hoàn trả đơn hàng cho đơn hàng đang giao
 */
export async function submitCustomerReturnRequest(request, response, next) {
  try {
    const { id } = request.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    const payload = parseCustomerReturnRequest(request.body);

    const now = new Date();
    const updateResult = await Order.updateOne(
      {
        _id: id,
        customerId: request.user._id,
        channel: "online",
        orderStatus: "shipping",
        creationState: { $ne: "pending" },
        "returnRequest.status": { $exists: false },
      },
      {
        $set: {
          returnRequest: {
            reason: payload.reason,
            bankAccount: payload.bankAccount,
            description: payload.description,
            images: payload.images || [],
            status: "pending",
            refundRequired: false,
            refundStatus: "none",
            requestedBy: request.user._id,
            requestedAt: now,
          },
        },
      },
      { runValidators: true }
    );

    if (updateResult.modifiedCount !== 1) {
      const order = await Order.findById(id).lean();
      if (!order || String(order.customerId) !== String(request.user._id) || order.creationState === "pending") {
        throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
      }
      if (order.returnRequest?.status) {
        throw new AppError("Đơn hàng đã có yêu cầu hoàn trả.", 409, "DUPLICATE_RETURN_REQUEST");
      }
      if (order.orderStatus !== "shipping") {
        throw new AppError("Chỉ có thể gửi yêu cầu hoàn trả khi đơn hàng đang giao.", 409, "INVALID_ORDER_TRANSITION");
      }
      throw new AppError("Không thể gửi yêu cầu hoàn trả vào lúc này.", 409, "RETURN_REQUEST_CONFLICT");
    }

    response.set("Cache-Control", "no-store");
    response.status(201).json({
      success: true,
      data: {
        returnRequest: {
          reason: payload.reason,
          bankAccount: payload.bankAccount,
          description: payload.description,
          images: payload.images || [],
          status: "pending",
          refundRequired: false,
          refundStatus: "none",
          requestedAt: now.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================
// 2. STAFF RETURN WORKFLOW
// =============================================================

/**
 * GET /api/v1/staff/returns
 * Danh sách yêu cầu hoàn trả hàng cho Staff Workspace
 */
export async function listStaffReturns(request, response, next) {
  try {
    const { query, status, page, pageSize } = parseStaffReturnQuery(request.query);

    const baseFilter = {
      creationState: { $ne: "pending" },
      "returnRequest.status": { $exists: true },
    };

    if (status !== "all") {
      baseFilter["returnRequest.status"] = status;
    }

    if (query) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedQuery, "i");
      baseFilter.$or = [
        { orderCode: regex },
        { "shippingAddress.recipientName": regex },
        { "shippingAddress.phone": regex },
        { "guestInfo.name": regex },
        { "guestInfo.phone": regex },
      ];
    }

    const [totalItems, orders, countsAggregate] = await Promise.all([
      Order.countDocuments(baseFilter),
      Order.find(baseFilter)
        .sort({ "returnRequest.requestedAt": -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("returnRequest.requestedBy", "name email phone")
        .populate("returnRequest.reviewedBy", "name email")
        .lean(),
      Order.aggregate([
        {
          $match: {
            creationState: { $ne: "pending" },
            "returnRequest.status": { $exists: true },
          },
        },
        {
          $group: {
            _id: "$returnRequest.status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const group of countsAggregate) {
      if (counts[group._id] !== undefined) {
        counts[group._id] = group.count;
      }
      counts.all += group.count;
    }

    const items = orders.map((order) => {
      const req = order.returnRequest || {};
      const customer = {
        name: order.shippingAddress?.recipientName || order.guestInfo?.name || req.requestedBy?.name || "Khách hàng",
        phone: order.shippingAddress?.phone || order.guestInfo?.phone || req.requestedBy?.phone || "",
        email: req.requestedBy?.email || order.guestInfo?.email || "",
      };

      return {
        id: order._id.toString(),
        orderCode: order.orderCode,
        customer,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        returnRequest: {
          reason: req.reason,
          bankAccount: req.bankAccount || null,
          description: req.description,
          images: req.images || [],
          imageCount: (req.images || []).length,
          status: req.status,
          refundRequired: Boolean(req.refundRequired),
          refundStatus: req.refundStatus || "none",
          requestedAt: req.requestedAt ? req.requestedAt.toISOString() : null,
          reviewedAt: req.reviewedAt ? req.reviewedAt.toISOString() : null,
          reviewedByName: req.reviewedBy?.name || null,
          rejectionReason: req.rejectionReason || null,
        },
      };
    });

    response.set("Cache-Control", "no-store");
    response.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize) || 1,
        },
        counts,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/staff/returns/:id
 * Chi tiết yêu cầu hoàn trả & ảnh minh chứng
 */
export async function getStaffReturnDetail(request, response, next) {
  try {
    const id = parseOrderId(request.params);
    const order = await Order.findById(id)
      .populate("returnRequest.requestedBy", "name email phone")
      .populate("returnRequest.reviewedBy", "name email")
      .lean();

    if (!order || !order.returnRequest?.status || order.creationState === "pending") {
      throw new AppError("Không tìm thấy yêu cầu hoàn trả.", 404, "RETURN_NOT_FOUND");
    }

    const productIds = (order.items || []).map((i) => i.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).select("images variants").lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const items = (order.items || []).map((item) => {
      const prod = productMap.get(item.productId?.toString());
      const variant = prod?.variants?.find((v) => v.sku === item.variantSku);
      const img = item.image || variant?.image || prod?.images?.[0] || "";

      const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : 0;
      const qty = typeof item.qty === "number" ? item.qty : 1;
      const totalPrice = typeof item.totalPrice === "number" ? item.totalPrice : unitPrice * qty;

      return {
        productId: item.productId?.toString(),
        name: item.name,
        variantSku: item.variantSku,
        unitPrice,
        qty,
        totalPrice,
        image: img,
      };
    });

    const req = order.returnRequest;
    const customer = {
      name: order.shippingAddress?.recipientName || order.guestInfo?.name || req.requestedBy?.name || "Khách hàng",
      phone: order.shippingAddress?.phone || order.guestInfo?.phone || req.requestedBy?.phone || "",
      email: req.requestedBy?.email || order.guestInfo?.email || "",
    };

    response.set("Cache-Control", "no-store");
    response.json({
      success: true,
      data: {
        id: order._id.toString(),
        orderCode: order.orderCode,
        channel: order.channel,
        customer,
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
        returnRequest: {
          reason: req.reason,
          bankAccount: req.bankAccount || null,
          description: req.description,
          images: req.images || [],
          status: req.status,
          refundRequired: Boolean(req.refundRequired),
          refundStatus: req.refundStatus || "none",
          requestedAt: req.requestedAt ? req.requestedAt.toISOString() : null,
          reviewedAt: req.reviewedAt ? req.reviewedAt.toISOString() : null,
          reviewedByName: req.reviewedBy?.name || null,
          rejectionReason: req.rejectionReason || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/staff/returns/:id/decision
 * Staff phê duyệt hoặc từ chối yêu cầu hoàn trả
 */
export async function decideStaffReturn(request, response, next) {
  try {
    const id = parseOrderId(request.params);
    const { decision, rejectionReason } = parseStaffReturnDecision(request.body);

    const existingOrder = await Order.findById(id).lean();
    if (!existingOrder || existingOrder.creationState === "pending") {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    if (!existingOrder.returnRequest?.status) {
      throw new AppError("Đơn hàng không có yêu cầu hoàn trả.", 404, "RETURN_NOT_FOUND");
    }

    if (existingOrder.returnRequest.status !== "pending") {
      throw new AppError("Yêu cầu hoàn trả đã được xử lý trước đó.", 409, "RETURN_REQUEST_ALREADY_REVIEWED");
    }

    if (existingOrder.orderStatus !== "shipping" || existingOrder.channel !== "online") {
      throw new AppError("Đơn hàng không ở trạng thái hợp lệ để xử lý hoàn trả.", 409, "INVALID_ORDER_TRANSITION");
    }

    const now = new Date();
    const staffId = request.user._id;

    if (decision === "approve") {
      const isOnlinePaid = existingOrder.paymentMethod === "ONLINE" && existingOrder.paymentStatus === "paid";
      const refundRequired = isOnlinePaid;
      const refundStatus = refundRequired ? "pending_refund" : "none";

      const updateResult = await Order.updateOne(
        {
          _id: id,
          channel: "online",
          orderStatus: "shipping",
          "returnRequest.status": "pending",
        },
        {
          $set: {
            orderStatus: "returned",
            "returnRequest.status": "approved",
            "returnRequest.refundRequired": refundRequired,
            "returnRequest.refundStatus": refundStatus,
            "returnRequest.reviewedBy": staffId,
            "returnRequest.reviewedAt": now,
          },
          $push: {
            statusHistory: {
              from: "shipping",
              to: "returned",
              by: staffId,
              at: now,
            },
          },
        },
        { runValidators: true }
      );

      if (updateResult.modifiedCount !== 1) {
        throw new AppError("Yêu cầu hoàn trả đã được xử lý bởi nhân viên khác.", 409, "RETURN_DECISION_CONFLICT");
      }

      // Restock inventory for all items
      for (const item of existingOrder.items || []) {
        if (item.productId && item.variantSku && item.qty > 0) {
          await Product.updateOne(
            { _id: item.productId, "variants.sku": item.variantSku },
            { $inc: { "variants.$.stock": item.qty } }
          );
        }
      }

      // Audit Log
      await AuditLog.create({
        actorId: staffId,
        action: "order.return.approve",
        target: { collectionName: "orders", id: String(id) },
        summary: `Chấp nhận hoàn trả đơn hàng ${existingOrder.orderCode}${refundRequired ? " (cần hoàn tiền)" : ""}`,
        after: {
          orderCode: existingOrder.orderCode,
          orderStatus: "returned",
          refundRequired,
          refundStatus,
        },
        at: now,
      });

      response.set("Cache-Control", "no-store");
      return response.json({
        success: true,
        data: {
          orderId: String(id),
          decision: "approve",
          status: "approved",
          orderStatus: "returned",
          refundRequired,
          refundStatus,
        },
      });
    }

    if (decision === "reject") {
      const trimmedReason = rejectionReason.trim();
      const updateResult = await Order.updateOne(
        {
          _id: id,
          channel: "online",
          orderStatus: "shipping",
          "returnRequest.status": "pending",
        },
        {
          $set: {
            "returnRequest.status": "rejected",
            "returnRequest.rejectionReason": trimmedReason,
            "returnRequest.reviewedBy": staffId,
            "returnRequest.reviewedAt": now,
          },
        },
        { runValidators: true }
      );

      if (updateResult.modifiedCount !== 1) {
        throw new AppError("Yêu cầu hoàn trả đã được xử lý bởi nhân viên khác.", 409, "RETURN_DECISION_CONFLICT");
      }

      // Audit Log
      await AuditLog.create({
        actorId: staffId,
        action: "order.return.reject",
        target: { collectionName: "orders", id: String(id) },
        summary: `Từ chối hoàn trả đơn hàng ${existingOrder.orderCode}: ${trimmedReason}`,
        after: {
          orderCode: existingOrder.orderCode,
          rejectionReason: trimmedReason,
        },
        at: now,
      });

      response.set("Cache-Control", "no-store");
      return response.json({
        success: true,
        data: {
          orderId: String(id),
          decision: "reject",
          status: "rejected",
          rejectionReason: trimmedReason,
        },
      });
    }

    throw new AppError("Quyết định xử lý không hợp lệ.", 400, "INVALID_DECISION");
  } catch (error) {
    next(error);
  }
}

