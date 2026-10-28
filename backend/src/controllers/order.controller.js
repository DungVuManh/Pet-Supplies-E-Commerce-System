// =============================================================
// backend/src/controllers/order.controller.js
// Controller xử lý đơn hàng cho cả Staff Workspace và Khách hàng (Mua ngay & Cart)
// =============================================================

import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { Cart } from "../models/cart.model.js";
import {
  buildOrderSearchFilter,
  computeDateRange,
  parseOrderId,
  parseOrderQuery,
  staffOrderStatuses,
  staffOrderTransitions,
} from "../validators/order.validator.js";

const SORT_MAP = {
  createdAt_desc: { createdAt: -1 },
  createdAt_asc: { createdAt: 1 },
  total_desc: { total: -1 },
  total_asc: { total: 1 },
};

function generateOrderCode() {
  return `ORD${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
}

// -------------------------------------------------------------
// 1. DÀNH CHO CUSTOMER & GUEST (Mua ngay & Cart)
// -------------------------------------------------------------

/**
 * POST /api/v1/orders - Tạo đơn hàng vào MongoDB
 */
export async function createOrder(request, response, next) {
  try {
    const { items, shippingAddress, guestInfo, paymentMethod = "COD", email } = request.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return response.status(400).json({ success: false, message: "Đơn hàng phải có ít nhất 1 sản phẩm." });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new AppError("Không tìm thấy sản phẩm trong đơn hàng.", 404, "PRODUCT_NOT_FOUND");
      }

      const variant = product.variants?.find((v) => v.sku === item.variantSku);
      const unitPrice = variant?.price ?? product.price ?? item.unitPrice ?? 0;
      const qty = item.qty || item.quantity || 1;

      orderItems.push({
        productId: product._id,
        variantSku: item.variantSku || "default",
        name: product.name,
        unitPrice,
        qty,
      });

      subtotal += unitPrice * qty;
    }

    const shippingFee = Number(request.body.shippingFee) || 0;
    const discount = Number(request.body.discount) || 0;
    const total = subtotal - discount + shippingFee;

    // Chỉ lấy customerId từ hồ sơ đã xác thực; không tin ID do client gửi.
    const customerId = request.user?._id;

    // 3. Chuẩn hóa địa chỉ giao hàng
    const finalAddress = {
      recipientName: shippingAddress?.recipientName || "null",
      phone: shippingAddress?.phone || "null",
      province: shippingAddress?.province || "null",
      district: shippingAddress?.district || "null",
      ward: shippingAddress?.ward || "null",
      street: shippingAddress?.street || "null",
    };

    // 4. Tạo document order đảm bảo đầy đủ chính xác tất cả các trường
    const newOrder = await Order.create({
      orderCode: generateOrderCode(),
      customerId,
      email: email || guestInfo?.email || undefined,
      guestInfo: customerId ? undefined : guestInfo,
      items: orderItems,
      shippingAddress: finalAddress,
      subtotal,
      discount,
      shippingFee,
      total,
      paymentMethod,
      paymentStatus: "unpaid",
      orderStatus: "pending",
      channel: "online",
      statusHistory: [
        {
          to: "pending",
          at: new Date(),
        },
      ],
    });

    // Xóa các sản phẩm vừa mua khỏi giỏ hàng
    try {
      const guestToken =
        request.headers["x-guest-token"] ||
        request.authCookies?.["petly-guest-token"] ||
        request.query?.guestToken ||
        request.body?.guestToken;

      const filters = [];
      if (customerId) filters.push({ userId: customerId });
      if (guestToken) filters.push({ guestToken });

      if (filters.length > 0 && (mongoose.connection?.readyState === 1 || Boolean(Cart.updateMany?.mock))) {
        const purchasedSkus = orderItems.map((item) => item.variantSku);
        if (purchasedSkus.length > 0) {
          await Cart.updateMany(
            { $or: filters },
            { $pull: { items: { variantSku: { $in: purchasedSkus } } } }
          );
        }
      }
    } catch (cartError) {
      console.error("Lỗi khi xóa sản phẩm đã mua khỏi giỏ hàng:", cartError);
    }

    response.status(201).json({
      success: true,
      data: {
        order: newOrder,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/orders/:id/cancel hoặc DELETE /api/v1/orders/:id - Hủy đơn hàng (orderStatus: 'cancelled')
 */
export async function cancelOrder(request, response, next) {
  try {
    const { id } = request.params;
    const { reason, note } = request.body || {};

    const order = await Order.findById(id);

    if (!order) {
      return response.status(404).json({ success: false, message: "Không tìm thấy đơn hàng để hủy." });
    }

    if (order.orderStatus === "cancelled") {
      return response.status(400).json({ success: false, message: "Đơn hàng này đã được hủy trước đó." });
    }

    // Cập nhật trạng thái sang 'cancelled' thay vì xóa khỏi MongoDB
    const fromStatus = order.orderStatus;
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        $set: { orderStatus: "cancelled" },
        $push: {
          statusHistory: {
            from: fromStatus,
            to: "cancelled",
            at: new Date(),
          },
        },
      },
      { new: true }
    );

    response.status(200).json({
      success: true,
      message: "Đã hủy đơn hàng thành công.",
      data: {
        order: updatedOrder,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Giữ alias deleteOrder để tương thích ngược
export const deleteOrder = cancelOrder;

/**
 * GET /api/v1/orders/my-orders - Lấy danh sách đơn hàng của người dùng đang đăng nhập
 * - Lọc theo customerId từ token (request.user._id)
 * - Sắp xếp mới nhất lên đầu
 */
export async function getMyOrders(request, response, next) {
  try {
    // Lấy customerId từ user đã đăng nhập (middleware optionalAuth hoặc requireAuth đã gán)
    const customerId = request.user?._id;

    if (!customerId) {
      return response.status(401).json({ success: false, message: "Bạn cần đăng nhập để xem đơn hàng." });
    }

    // Tìm tất cả đơn của customer, mới nhất lên đầu
    const orders = await Order.find({ customerId })
      .sort({ createdAt: -1 })
      .lean();

    // Chuyển dữ liệu sang dạng đơn giản để frontend dùng
    const result = orders.map((order) => {
      // Ghép tên sản phẩm thành chuỗi tóm tắt: "Sản phẩm A, Sản phẩm B..."
      const productsSummary = order.items
        .map((item) => item.name)
        .join(", ")
        .slice(0, 60); // Cắt bớt nếu quá dài

      // Format ngày đặt hàng: "25/10/2026"
      const date = new Date(order.createdAt);
      const orderDate = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

      // Map trạng thái backend sang frontend
      const statusMap = {
        pending: { status: "pending", statusLabel: "Chờ xử lý" },
        processing: { status: "pending", statusLabel: "Đang xử lý" },
        shipping: { status: "shipping", statusLabel: "Đang giao" },
        completed: { status: "completed", statusLabel: "Hoàn thành" },
        cancelled: { status: "cancelled", statusLabel: "Đã hủy" },
      };

      const { status, statusLabel } = statusMap[order.orderStatus] || { status: "pending", statusLabel: "Chờ xử lý" };

      return {
        id: order._id.toString(),
        orderCode: order.orderCode,
        orderDate,
        productsSummary,
        itemCount: order.items.reduce((sum, item) => sum + (item.qty || 1), 0),
        totalAmount: order.total,
        status,
        statusLabel,
      };
    });

    response.json({
      success: true,
      data: { orders: result },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/orders/:id - Lấy chi tiết 1 đơn hàng theo ID (dành cho customer)
 */
export async function getOrderDetail(request, response, next) {
  try {
    const { id } = request.params;

    // Tìm đơn hàng theo ID trong MongoDB
    const order = await Order.findById(id).lean();

    if (!order || String(order.customerId) !== String(request.user?._id)) {
      return response.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
    }

    // Format ngày và giờ
    const date = new Date(order.createdAt);
    const orderDate = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    const orderTime = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    // Map trạng thái backend sang frontend
    const statusMap = {
      pending: { status: "pending", statusLabel: "Chờ xử lý" },
      processing: { status: "pending", statusLabel: "Đang xử lý" },
      shipping: { status: "shipping", statusLabel: "Đang giao" },
      completed: { status: "completed", statusLabel: "Hoàn thành" },
      cancelled: { status: "cancelled", statusLabel: "Đã hủy" },
    };

    const { status, statusLabel } = statusMap[order.orderStatus] || { status: "pending", statusLabel: "Chờ xử lý" };

    // Tạo timeline tự động theo trạng thái hiện tại
    const timelineSteps = status === "cancelled"
      ? [
        { id: "step-1", title: "Đã đặt hàng", description: `${orderDate} · ${orderTime}`, status: "completed" },
        { id: "step-cancelled", title: "Đã hủy đơn", description: "Đơn hàng đã được hủy", status: "completed" },
      ]
      : [
        { id: "step-1", title: "Đã đặt hàng", description: `${orderDate} · ${orderTime}`, status: "completed" },
        { id: "step-2", title: "Đang chuẩn bị", description: "Xác nhận đơn", status: status === "pending" ? "active" : "completed" },
        { id: "step-3", title: "Đang giao", description: "Trên đường giao", status: status === "shipping" ? "active" : status === "completed" ? "completed" : "pending" },
        { id: "step-4", title: "Hoàn thành", description: "Nhận hàng thành công", status: status === "completed" ? "completed" : "pending" },
      ];

    // Map danh sách sản phẩm trong đơn
    const items = order.items.map((item, index) => ({
      id: item.productId?.toString() || `item-${index}`,
      name: item.name,
      description: `SKU: ${item.variantSku}`,
      sku: item.variantSku,
      price: item.unitPrice,
      quantity: item.qty,
      image: "/images/placeholder-product.png", // Ảnh lấy từ product nếu cần
    }));

    // Chuẩn hóa địa chỉ giao hàng
    const shippingAddress = {
      fullName: order.shippingAddress?.recipientName || order.guestInfo?.name || "",
      phone: order.shippingAddress?.phone || order.guestInfo?.phone || "",
      address: [
        order.shippingAddress?.street,
        order.shippingAddress?.ward,
        order.shippingAddress?.district,
        order.shippingAddress?.province,
      ].filter(Boolean).join(", "),
    };

    const result = {
      id: order._id.toString(),
      orderCode: order.orderCode,
      orderDate,
      orderTime,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      status,
      statusLabel,
      timeline: timelineSteps,
      items,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee || 0,
      discount: order.discount || 0,
      totalAmount: order.total,
      paymentMethod: order.paymentMethod === "COD" ? "COD" : order.paymentMethod,
      paymentStatus: order.paymentStatus === "unpaid" ? "Chưa thanh toán" : "Đã thanh toán",
      transactionCode: order.orderCode, // Dùng orderCode làm mã giao dịch tạm thời
      shippingAddress,
    };

    response.json({
      success: true,
      data: { order: result },
    });
  } catch (error) {
    next(error);
  }
}

// -------------------------------------------------------------
// 2. DÀNH CHO STAFF WORKSPACE (Quản lý đơn hàng)
// -------------------------------------------------------------

export async function listStaffOrders(request, response, next) {
  try {
    const { query, status, dateFrom, dateTo, sort, page, pageSize } = parseOrderQuery(request.query);

    const baseConditions = [{ creationState: { $nin: ["pending"] } }];
    const searchFilter = buildOrderSearchFilter(query);
    if (Object.keys(searchFilter).length > 0) {
      baseConditions.push(searchFilter);
    }

    const dateRange = computeDateRange(dateFrom, dateTo);
    if (Object.keys(dateRange).length > 0) {
      baseConditions.push({ createdAt: dateRange });
    }

    const baseFilter =
      baseConditions.length === 0
        ? {}
        : baseConditions.length === 1
          ? baseConditions[0]
          : { $and: baseConditions };

    let summaryAll = 0;
    const statusCounts = Object.fromEntries(staffOrderStatuses.map((s) => [s, 0]));

    let items = [];
    let total = 0;

    try {
      const countGroupPromise = Order.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]);

      const filterWithStatus =
        status === "all"
          ? baseFilter
          : {
            $and: [...baseConditions, { orderStatus: status }],
          };

      const sortObj = SORT_MAP[sort] || SORT_MAP.createdAt_desc;

      const itemsPromise = Order.find(filterWithStatus)
        .select(
          "_id orderCode createdAt guestInfo shippingAddress items total orderStatus paymentMethod paymentStatus channel"
        )
        .sort(sortObj)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean();

      const totalPromise = Order.countDocuments(filterWithStatus);

      const [groupResults, rawItems, totalCount] = await Promise.all([
        countGroupPromise,
        itemsPromise,
        totalPromise,
      ]);

      for (const group of groupResults) {
        const groupStatus = group._id;
        if (groupStatus in statusCounts) {
          statusCounts[groupStatus] += group.count;
        }
        summaryAll += group.count;
      }

      total = totalCount;
      items = rawItems.map((order) => {
        const recipientName =
          order.guestInfo?.name || order.shippingAddress?.recipientName || "";
        const phone = order.guestInfo?.phone || order.shippingAddress?.phone || "";
        const itemCount =
          order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;

        return {
          id: order._id.toString(),
          orderCode: order.orderCode,
          createdAt: order.createdAt.toISOString(),
          customer: {
            name: recipientName,
            phone,
          },
          itemCount,
          total: order.total,
          orderStatus: order.orderStatus,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          channel: order.channel,
        };
      });
    } catch {
      throw new AppError(
        "Chưa thể đọc danh sách đơn hàng. Vui lòng thử lại.",
        503,
        "ORDERS_UNAVAILABLE"
      );
    }

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    response.set("Cache-Control", "no-store");
    response.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
        summary: {
          all: summaryAll,
          statusCounts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getStaffOrderDetail(request, response, next) {
  try {
    const id = parseOrderId(request.params);

    let order;
    try {
      order = await Order.findById(id).lean();
    } catch {
      throw new AppError(
        "Chưa thể đọc thông tin đơn hàng. Vui lòng thử lại.",
        503,
        "ORDERS_UNAVAILABLE"
      );
    }

    if (!order || order.creationState === "pending") {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    const productIds = [
      ...new Set(order.items?.map((item) => item.productId?.toString()).filter(Boolean)),
    ];
    let productMap = new Map();
    if (productIds.length > 0) {
      try {
        const products = await Product.find({ _id: { $in: productIds } }).lean();
        for (const p of products) {
          productMap.set(p._id.toString(), p);
        }
      } catch {
        console.warn("[getStaffOrderDetail] Failed to batch load products for order", id);
      }
    }

    const userIds = [
      ...new Set(
        [
          ...(order.statusHistory || []).map((h) => h.by?.toString()),
          order.createdByStaffId?.toString(),
        ].filter(Boolean)
      ),
    ];
    let userMap = new Map();
    if (userIds.length > 0) {
      try {
        const users = await User.find({ _id: { $in: userIds } })
          .select("_id fullName")
          .lean();
        for (const u of users) {
          userMap.set(u._id.toString(), u.fullName);
        }
      } catch {
        console.warn("[getStaffOrderDetail] Failed to batch load users for order", id);
      }
    }

    const items = (order.items || []).map((item) => {
      const prod = productMap.get(item.productId?.toString());
      const variant = prod?.variants?.find((v) => v.sku === item.variantSku);

      let currentProduct = null;
      if (prod && variant) {
        const physical = variant.stock ?? 0;
        const reserved = variant.reservedStock ?? 0;
        currentProduct = {
          image: prod.images?.[0] || null,
          variantLabel: variant.label || null,
          stock: physical,
          reservedStock: reserved,
          availableStock: physical - reserved,
        };
      }

      const unitPrice = item.unitPrice || 0;
      const qty = item.qty || 0;

      return {
        productId: item.productId?.toString(),
        variantSku: item.variantSku,
        name: item.name,
        unitPrice,
        qty,
        lineTotal: unitPrice * qty,
        currentProduct,
      };
    });

    const statusHistory = (order.statusHistory || [])
      .map((h) => ({
        from: h.from || null,
        to: h.to,
        at: h.at ? new Date(h.at).toISOString() : new Date().toISOString(),
        actorName: h.by ? userMap.get(h.by.toString()) || null : null,
      }))
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const recipientName =
      order.guestInfo?.name || order.shippingAddress?.recipientName || "";
    const phone = order.guestInfo?.phone || order.shippingAddress?.phone || "";
    const email = order.guestInfo?.email || null;

    const shipping =
      order.shipping?.carrier || order.shipping?.trackingNumber
        ? {
          carrier: order.shipping.carrier || "",
          trackingNumber: order.shipping.trackingNumber || "",
        }
        : null;

    const createdByStaff = order.createdByStaffId
      ? userMap.get(order.createdByStaffId.toString()) || null
      : null;

    const dto = {
      id: order._id.toString(),
      orderCode: order.orderCode,
      createdAt: order.createdAt.toISOString(),
      customer: {
        name: recipientName,
        phone,
        email,
      },
      subtotal: order.subtotal,
      discount: order.discount || 0,
      shippingFee: order.shippingFee || 0,
      total: order.total,
      promotionCode: order.promotionCode || null,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      channel: order.channel,
      shippingAddress: {
        recipientName: order.shippingAddress?.recipientName || "",
        phone: order.shippingAddress?.phone || "",
        province: order.shippingAddress?.province || "",
        district: order.shippingAddress?.district || "",
        ward: order.shippingAddress?.ward || "",
        street: order.shippingAddress?.street || "",
      },
      shipping,
      createdByStaff,
      items,
      statusHistory,
      allowedNextStatuses: order.channel === "online" ? staffOrderTransitions[order.orderStatus] || [] : [],
    };

    response.set("Cache-Control", "no-store");
    response.json({
      success: true,
      data: {
        order: dto,
      },
    });
  } catch (error) {
    next(error);
  }
}
