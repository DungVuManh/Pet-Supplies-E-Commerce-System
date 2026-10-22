import { AppError } from "../common/errors/app-error.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { orderStatuses } from "../models/shared.schema.js";
import {
  buildOrderSearchFilter,
  computeDateRange,
  parseOrderId,
  parseOrderQuery,
} from "../validators/order.validator.js";

const SORT_MAP = {
  createdAt_desc: { createdAt: -1, _id: -1 },
  createdAt_asc: { createdAt: 1, _id: 1 },
  total_desc: { total: -1, _id: -1 },
  total_asc: { total: 1, _id: 1 },
};

export async function listStaffOrders(request, response, next) {
  try {
    const params = parseOrderQuery(request.query);
    const { query, status, dateFrom, dateTo, sort, page, pageSize } = params;

    const searchFilter = buildOrderSearchFilter(query);
    const dateRange = computeDateRange(dateFrom, dateTo);

    const baseConditions = [];
    if (Object.keys(searchFilter).length > 0) {
      baseConditions.push(searchFilter);
    }
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
    const statusCounts = Object.fromEntries(orderStatuses.map((s) => [s, 0]));

    let items = [];
    let total = 0;

    try {
      // 1. Compute summary counts (bypassing status filter)
      const countGroupPromise = Order.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]);

      // 2. Compute filtered list & total count
      const filterWithStatus =
        status === "all"
          ? baseFilter
          : {
              ...(baseConditions.length > 0 ? { $and: [...baseConditions, { orderStatus: status }] } : { orderStatus: status }),
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
        if (group._id in statusCounts) {
          statusCounts[group._id] = group.count;
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

    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    // Batch product enrichment
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
        // If product lookup fails, keep order snapshot without throwing
        console.warn("[getStaffOrderDetail] Failed to batch load products for order", id);
      }
    }

    // Batch user enrichment
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
      order.shipping?.carrier && order.shipping?.trackingNumber
        ? {
            carrier: order.shipping.carrier,
            trackingNumber: order.shipping.trackingNumber,
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
