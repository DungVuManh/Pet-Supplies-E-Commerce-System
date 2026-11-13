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
import { resolveCompletedAt } from "../common/order-auto-complete.js";

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

    const isShipping = order.orderStatus === "shipping";
    const completedAt = resolveCompletedAt(order);
    const isCompletedWithin7Days =
      order.orderStatus === "completed" &&
      completedAt &&
      Date.now() - completedAt.getTime() <= 7 * 24 * 60 * 60 * 1000;

    if (!isShipping && !isCompletedWithin7Days) {
      if (order.orderStatus === "completed") {
        throw new AppError(
          "Đơn hàng đã quá thời hạn yêu cầu hoàn trả (tối đa 7 ngày kể từ khi nhận hàng).",
          400,
          "RETURN_PERIOD_EXPIRED"
        );
      }
      throw new AppError(
        "Chỉ có thể yêu cầu hoàn trả khi đơn hàng đang giao hoặc trong vòng 7 ngày sau khi nhận hàng.",
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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const statusMatch =
      payload.reason === "not_received"
        ? { orderStatus: "shipping" }
        : {
            $or: [
              { orderStatus: "shipping" },
              {
                orderStatus: "completed",
                $or: [
                  {
                    statusHistory: {
                      $elemMatch: {
                        to: "completed",
                        at: { $gte: sevenDaysAgo },
                      },
                    },
                  },
                  {
                    statusHistory: { $not: { $elemMatch: { to: "completed" } } },
                    updatedAt: { $gte: sevenDaysAgo },
                  },
                ],
              },
            ],
          };

    const updateResult = await Order.updateOne(
      {
        _id: id,
        customerId: request.user._id,
        channel: "online",
        creationState: { $ne: "pending" },
        "returnRequest.status": { $exists: false },
        ...statusMatch,
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
      if (order.orderStatus === "completed" && payload.reason === "not_received") {
        throw new AppError(
          "Đơn hàng đã được xác nhận nhận hàng, không thể chọn lý do chưa nhận được hàng.",
          400,
          "INVALID_RETURN_REASON"
        );
      }
      if (!["shipping", "completed"].includes(order.orderStatus)) {
        throw new AppError("Chỉ có thể gửi yêu cầu hoàn trả khi đơn hàng đang giao hoặc trong vòng 7 ngày sau khi nhận hàng.", 409, "INVALID_ORDER_TRANSITION");
      }
      if (order.orderStatus === "completed") {
        const completedAt = resolveCompletedAt(order);
        if (completedAt && now.getTime() - completedAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
          throw new AppError("Đơn hàng đã quá thời hạn yêu cầu hoàn trả (tối đa 7 ngày kể từ khi nhận hàng).", 400, "RETURN_PERIOD_EXPIRED");
        }
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

/**
 * POST /api/v1/orders/:id/return/confirm-shipped
 * Khách hàng bấm "Xác nhận đã gửi trả hàng" sau khi Staff đã duyệt yêu cầu
 */
export async function confirmCustomerReturnShipped(request, response, next) {
  try {
    const { id } = request.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const updateResult = await Order.updateOne(
      {
        _id: id,
        customerId: request.user._id,
        channel: "online",
        creationState: { $ne: "pending" },
        "returnRequest.status": "approved",
        $or: [
          { "returnRequest.approvedAt": { $exists: false } },
          { "returnRequest.approvedAt": null },
          { "returnRequest.approvedAt": { $gte: threeDaysAgo } },
        ],
      },
      {
        $set: {
          "returnRequest.status": "customer_shipped",
          "returnRequest.customerShippedAt": now,
        },
      },
      { runValidators: true }
    );

    if (updateResult.modifiedCount !== 1) {
      const order = await Order.findById(id).lean();
      if (!order || String(order.customerId) !== String(request.user._id) || order.creationState === "pending") {
        throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
      }
      if (!order.returnRequest?.status) {
        throw new AppError("Đơn hàng chưa có yêu cầu hoàn trả.", 404, "RETURN_NOT_FOUND");
      }
      if (order.returnRequest.status !== "approved") {
        throw new AppError("Chỉ có thể xác nhận gửi hàng khi yêu cầu đã được duyệt.", 409, "INVALID_RETURN_STATE");
      }
      if (
        order.returnRequest.approvedAt &&
        new Date(order.returnRequest.approvedAt).getTime() < threeDaysAgo.getTime()
      ) {
        throw new AppError("Yêu cầu hoàn trả đã quá hạn gửi hàng (3 ngày).", 400, "RETURN_SHIPPING_EXPIRED");
      }
      throw new AppError("Không thể xác nhận gửi hàng vào lúc này.", 409, "RETURN_CONFLICT");
    }

    response.set("Cache-Control", "no-store");
    response.json({
      success: true,
      data: {
        orderId: String(id),
        status: "customer_shipped",
        customerShippedAt: now.toISOString(),
        returnRequest: {
          status: "customer_shipped",
          customerShippedAt: now.toISOString(),
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
      customer_shipped: 0,
      received: 0,
      completed: 0,
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
          refundAmount: req.refundAmount || null,
          requestedAt: req.requestedAt ? req.requestedAt.toISOString() : null,
          approvedAt: req.approvedAt ? req.approvedAt.toISOString() : null,
          customerShippedAt: req.customerShippedAt ? req.customerShippedAt.toISOString() : null,
          receivedAt: req.receivedAt ? req.receivedAt.toISOString() : null,
          completedAt: req.completedAt ? req.completedAt.toISOString() : null,
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
          refundAmount: req.refundAmount || null,
          requestedAt: req.requestedAt ? req.requestedAt.toISOString() : null,
          approvedAt: req.approvedAt ? req.approvedAt.toISOString() : null,
          customerShippedAt: req.customerShippedAt ? req.customerShippedAt.toISOString() : null,
          receivedAt: req.receivedAt ? req.receivedAt.toISOString() : null,
          completedAt: req.completedAt ? req.completedAt.toISOString() : null,
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
 * POST /api/v1/staff/returns/:id/receive
 * Nhân viên bấm "Đã nhận được hàng" khi kiện hàng hoàn về đến cửa hàng
 */
export async function receiveStaffReturn(request, response, next) {
  try {
    const id = parseOrderId(request.params);
    const now = new Date();
    const staffId = request.user._id;

    const updateResult = await Order.updateOne(
      {
        _id: id,
        creationState: { $ne: "pending" },
        "returnRequest.status": "customer_shipped",
      },
      {
        $set: {
          "returnRequest.status": "received",
          "returnRequest.receivedAt": now,
          "returnRequest.reviewedBy": staffId,
        },
      },
      { runValidators: true }
    );

    if (updateResult.modifiedCount !== 1) {
      const order = await Order.findById(id).lean();
      if (!order || order.creationState === "pending") {
        throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
      }
      if (!order.returnRequest?.status) {
        throw new AppError("Đơn hàng không có yêu cầu hoàn trả.", 404, "RETURN_NOT_FOUND");
      }
      if (order.returnRequest.status !== "customer_shipped") {
        throw new AppError(
          "Chỉ có thể xác nhận nhận hàng khi khách đã gửi trả hàng.",
          409,
          "INVALID_RETURN_STATE"
        );
      }
      throw new AppError(
        "Yêu cầu hoàn trả đã được cập nhật bởi nhân viên khác.",
        409,
        "RETURN_CONFLICT"
      );
    }

    await AuditLog.create({
      actorId: staffId,
      action: "order.return.receive",
      target: { collectionName: "orders", id: String(id) },
      summary: `Nhân viên xác nhận đã nhận được hàng hoàn cho đơn hàng ${id}`,
      after: {
        orderId: String(id),
        status: "received",
        receivedAt: now,
      },
      at: now,
    });

    response.set("Cache-Control", "no-store");
    response.json({
      success: true,
      data: {
        orderId: String(id),
        status: "received",
        receivedAt: now.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/staff/returns/:id/decision
 * Staff phê duyệt hoặc từ chối yêu cầu hoàn trả (hỗ trợ cả chu trình 4 bước và legacy 1 bước)
 */
export async function decideStaffReturn(request, response, next) {
  try {
    const id = parseOrderId(request.params);
    const { action, decision, refundAmount, rejectionReason } = parseStaffReturnDecision(request.body);

    const existingOrder = await Order.findById(id).lean();
    if (!existingOrder || existingOrder.creationState === "pending") {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    if (!existingOrder.returnRequest?.status) {
      throw new AppError("Đơn hàng không có yêu cầu hoàn trả.", 404, "RETURN_NOT_FOUND");
    }

    const currentStatus = existingOrder.returnRequest.status;
    if (currentStatus === "completed" || currentStatus === "rejected") {
      throw new AppError("Yêu cầu hoàn trả đã được xử lý trước đó.", 409, "RETURN_REQUEST_ALREADY_REVIEWED");
    }

    const now = new Date();
    const staffId = request.user._id;

    // 1. Phê duyệt ban đầu (Staff cho phép khách gửi hàng)
    if (action === "approve_request") {
      if (currentStatus !== "pending") {
        throw new AppError("Chỉ có thể duyệt yêu cầu khi đang ở trạng thái chờ duyệt.", 409, "INVALID_RETURN_STATE");
      }

      const updateResult = await Order.updateOne(
        {
          _id: id,
          channel: "online",
          "returnRequest.status": "pending",
        },
        {
          $set: {
            "returnRequest.status": "approved",
            "returnRequest.approvedAt": now,
            "returnRequest.reviewedBy": staffId,
            "returnRequest.reviewedAt": now,
          },
        },
        { runValidators: true }
      );

      if (updateResult.modifiedCount !== 1) {
        throw new AppError("Yêu cầu hoàn trả đã được xử lý bởi nhân viên khác.", 409, "RETURN_DECISION_CONFLICT");
      }

      await AuditLog.create({
        actorId: staffId,
        action: "order.return.approve_request",
        target: { collectionName: "orders", id: String(id) },
        summary: `Chấp nhận yêu cầu hoàn trả ban đầu cho đơn hàng ${existingOrder.orderCode}`,
        after: {
          orderCode: existingOrder.orderCode,
          status: "approved",
        },
        at: now,
      });

      response.set("Cache-Control", "no-store");
      return response.json({
        success: true,
        data: {
          orderId: String(id),
          decision: "approve",
          action: "approve_request",
          status: "approved",
          approvedAt: now.toISOString(),
        },
      });
    }

    // 2. Quyết định hoàn tiền sau khi đã nhận được hàng (complete_refund)
    if (action === "complete_refund") {
      if (currentStatus !== "received") {
        throw new AppError("Chỉ có thể hoàn tiền sau khi đã nhận được hàng.", 409, "INVALID_RETURN_STATE");
      }

      const finalRefundAmount = typeof refundAmount === "number" ? refundAmount : existingOrder.total;
      const updateResult = await Order.updateOne(
        {
          _id: id,
          channel: "online",
          "returnRequest.status": "received",
        },
        {
          $set: {
            orderStatus: "returned",
            paymentStatus: "paid",
            paidAmount: existingOrder.total,
            "returnRequest.status": "completed",
            "returnRequest.completedAt": now,
            "returnRequest.refundAmount": finalRefundAmount,
            "returnRequest.refundRequired": true,
            "returnRequest.refundStatus": "refunded",
            "returnRequest.reviewedBy": staffId,
            "returnRequest.reviewedAt": now,
          },
          $push: {
            statusHistory: {
              from: existingOrder.orderStatus,
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

      // Hoàn kho tồn sản phẩm
      for (const item of existingOrder.items || []) {
        if (item.productId && item.variantSku && item.qty > 0) {
          await Product.updateOne(
            { _id: item.productId, "variants.sku": item.variantSku },
            { $inc: { "variants.$.stock": item.qty } }
          );
        }
      }

      await AuditLog.create({
        actorId: staffId,
        action: "order.return.complete_refund",
        target: { collectionName: "orders", id: String(id) },
        summary: `Hoàn tất hoàn tiền ${finalRefundAmount} đ cho đơn hàng ${existingOrder.orderCode}`,
        after: {
          orderCode: existingOrder.orderCode,
          orderStatus: "returned",
          refundStatus: "refunded",
          refundAmount: finalRefundAmount,
        },
        at: now,
      });

      response.set("Cache-Control", "no-store");
      return response.json({
        success: true,
        data: {
          orderId: String(id),
          decision: "approve",
          action: "complete_refund",
          status: "completed",
          orderStatus: "returned",
          paymentStatus: "paid",
          refundRequired: true,
          refundStatus: "refunded",
          refundAmount: finalRefundAmount,
        },
      });
    }

    // 3. Từ chối yêu cầu (reject_request hoặc reject_refund hoặc decision === "reject")
    if (decision === "reject" || action === "reject_request" || action === "reject_refund") {
      const trimmedReason = rejectionReason.trim();
      const updateResult = await Order.updateOne(
        {
          _id: id,
          channel: "online",
          "returnRequest.status": { $in: ["pending", "customer_shipped", "received", "approved"] },
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

    // 4. Fallback legacy approve (cho các unit test cũ gửi { decision: "approve" } từ pending)
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
            paymentStatus: "paid",
            paidAmount: existingOrder.total,
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

      for (const item of existingOrder.items || []) {
        if (item.productId && item.variantSku && item.qty > 0) {
          await Product.updateOne(
            { _id: item.productId, "variants.sku": item.variantSku },
            { $inc: { "variants.$.stock": item.qty } }
          );
        }
      }

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

    throw new AppError("Quyết định xử lý không hợp lệ.", 400, "INVALID_DECISION");
  } catch (error) {
    next(error);
  }
}

