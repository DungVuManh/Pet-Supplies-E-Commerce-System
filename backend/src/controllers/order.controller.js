// =============================================================
// backend/src/controllers/order.controller.js
// Controller xử lý đơn hàng cho cả Staff Workspace và Khách hàng (Mua ngay & Cart)
// =============================================================

import { AppError } from "../common/errors/app-error.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
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

function staffOrderStatus(status) {
  if (status === "delivered") return "completed";
  return status;
}

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
    const { items, shippingAddress, guestInfo, paymentMethod = "COD" } = request.body;

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

    const shippingFee = 30000;
    const discount = 0;
    const total = subtotal + shippingFee - discount;

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
 * DELETE /api/v1/orders/:id - Xóa đơn hàng khi hủy mua ngay
 */
export async function deleteOrder(request, response, next) {
  try {
    const { id } = request.params;
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return response.status(404).json({ success: false, message: "Không tìm thấy đơn hàng để xóa." });
    }

    response.status(200).json({
      success: true,
      message: "Đã hủy và xóa đơn hàng thành công.",
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

    const baseConditions = [];
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
            $and: [...baseConditions, { orderStatus: status === "completed" ? { $in: ["completed", "delivered"] } : status }],
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
        const status = staffOrderStatus(group._id);
        if (status in statusCounts) {
          statusCounts[status] += group.count;
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
          orderStatus: staffOrderStatus(order.orderStatus),
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
        from: staffOrderStatus(h.from) || null,
        to: staffOrderStatus(h.to),
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
      orderStatus: staffOrderStatus(order.orderStatus),
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
