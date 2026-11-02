import { AppError } from "../common/errors/app-error.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { parseSalesSummaryQuery } from "../validators/admin-sales.validator.js";
import {
  visibleOrders,
  aggregate,
  safeNumber,
  mongoBucket,
} from "./staff-analytics.helpers.js";
import { DAY, localDate } from "../validators/staff-analytics.validator.js";

/**
 * GET /api/v1/admin/reports/sales/summary?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 *
 * Trả về dữ liệu báo cáo bán hàng từ MongoDB:
 *   1. 3 chỉ số KPI: Sản phẩm đã bán, Giá trị đơn trung bình, Danh mục dẫn đầu.
 *   2. Biểu đồ cột số lượng bán theo ngày (dailySalesVolume).
 *   3. 4 bảng phân tích:
 *      - productSales: Theo sản phẩm
 *      - categorySales: Theo danh mục
 *      - staffSales: Theo nhân viên (kèm Kênh bán lẻ Online)
 *      - timeSales: Theo thời gian (chia theo tuần)
 */
export async function getSalesSummary(request, response) {
  const { dateFrom, dateTo, start, end } = parseSalesSummaryQuery(request.query);

  try {
    const baseMatch = {
      ...visibleOrders,
      orderStatus: "completed",
      paymentStatus: "paid",
      createdAt: { $gte: start, $lt: end },
    };

    // 1. Chạy song song aggregation tổng quan đơn và chi tiết theo danh mục
    const [overviewFacet, categoryItems] = await Promise.all([
      aggregate(Order, [
        { $match: baseMatch },
        {
          $facet: {
            overview: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalRevenue: { $sum: "$total" },
                },
              },
            ],
            // Sản phẩm đã bán & số lượng theo ngày
            dailyVolume: [
              { $unwind: "$items" },
              {
                $group: {
                  _id: mongoBucket("$createdAt", "day"),
                  qty: { $sum: "$items.qty" },
                },
              },
            ],
            // Phân tích theo từng sản phẩm SKU
            byProduct: [
              { $unwind: "$items" },
              {
                $group: {
                  _id: "$items.variantSku",
                  sku: { $first: "$items.variantSku" },
                  name: { $first: "$items.name" },
                  productId: { $first: "$items.productId" },
                  quantity: { $sum: "$items.qty" },
                  revenue: { $sum: { $multiply: ["$items.qty", "$items.unitPrice"] } },
                  orderIds: { $addToSet: "$_id" },
                  staffIds: { $addToSet: "$createdByStaffId" },
                  channels: { $addToSet: "$channel" },
                },
              },
              { $sort: { revenue: -1, quantity: -1 } },
            ],
            // Phân tích theo nhân viên / kênh tạo đơn
            byStaff: [
              {
                $group: {
                  _id: "$createdByStaffId",
                  orders: { $sum: 1 },
                  revenue: { $sum: "$total" },
                  items: { $push: "$items" },
                },
              },
              { $sort: { revenue: -1 } },
            ],
            // Danh sách đơn hàng phục vụ tính theo tuần
            byOrderTime: [
              {
                $project: {
                  createdAt: 1,
                  total: 1,
                  itemQty: { $sum: "$items.qty" },
                },
              },
              { $sort: { createdAt: 1 } },
            ],
          },
        },
      ]),
      // Aggregate theo Category (lookup Product -> Category)
      aggregate(Order, [
        { $match: baseMatch },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "categories",
            localField: "product.categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ["$category.name", "Khác"] },
            category: { $first: { $ifNull: ["$category.name", "Khác"] } },
            revenue: { $sum: { $multiply: ["$items.qty", "$items.unitPrice"] } },
            quantity: { $sum: "$items.qty" },
            orderIds: { $addToSet: "$_id" },
          },
        },
        { $sort: { revenue: -1, quantity: -1 } },
      ]),
    ]);

    const facet = overviewFacet?.[0] || {};
    const totalOrders = safeNumber(facet.overview?.[0]?.totalOrders ?? 0);
    const totalRevenue = safeNumber(facet.overview?.[0]?.totalRevenue ?? 0);

    // 2. Tra cứu thông tin User của các Staff xuất hiện trong đơn
    const rawStaffList = facet.byStaff || [];
    const staffUserIds = rawStaffList
      .map((s) => s._id)
      .filter((id) => id && id.toString().length === 24);

    const staffUsers = staffUserIds.length > 0
      ? await User.find({ _id: { $in: staffUserIds } }).select("fullName role").lean()
      : [];
    const staffUserMap = new Map(staffUsers.map((u) => [u._id.toString(), u]));

    // 3. Xây dựng mảng categorySales
    const categorySales = (categoryItems || []).map((cat) => {
      const revenue = safeNumber(cat.revenue);
      const orders = cat.orderIds?.length ?? 0;
      const quantity = safeNumber(cat.quantity);
      const shareNum = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      const share = `${shareNum.toFixed(1).replace(".", ",")}% tổng doanh thu`;
      return {
        category: cat.category,
        revenue,
        orders,
        quantity,
        share,
      };
    });

    // 4. Xây dựng mảng productSales
    const productSales = (facet.byProduct || []).map((prod) => {
      const revenue = safeNumber(prod.revenue);
      const quantity = safeNumber(prod.quantity);
      const orders = prod.orderIds?.length ?? 0;
      const shareNum = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      const share = `${shareNum.toFixed(1).replace(".", ",")}% tổng doanh thu`;

      // Xác định người bán / kênh
      let staffLabel = "Website (Trực tuyến)";
      const validStaffIds = (prod.staffIds || []).filter((id) => id);
      if (validStaffIds.length === 1) {
        const u = staffUserMap.get(validStaffIds[0].toString());
        if (u) staffLabel = u.fullName;
      } else if (validStaffIds.length > 1) {
        staffLabel = "Nhiều nhân viên";
      }

      return {
        sku: prod.sku,
        name: prod.name,
        staff: staffLabel,
        orders,
        share,
        revenue,
        quantity,
        unit: "sản phẩm",
      };
    });

    // 5. Xây dựng mảng staffSales
    const staffSales = rawStaffList.map((staffGroup) => {
      const revenue = safeNumber(staffGroup.revenue);
      const orders = safeNumber(staffGroup.orders);

      let staffName = "Website (Trực tuyến)";
      let staffRole = "Kênh bán lẻ Online";

      if (staffGroup._id) {
        const u = staffUserMap.get(staffGroup._id.toString());
        if (u) {
          staffName = u.fullName;
          staffRole = u.role === "staff" ? "Nhân viên kinh doanh" : "Quản trị viên";
        }
      }

      // Tìm sản phẩm bán chạy nhất của nhân viên/kênh này
      const itemMap = new Map();
      const allItems = (staffGroup.items || []).flat();
      for (const item of allItems) {
        const current = itemMap.get(item.name) || 0;
        itemMap.set(item.name, current + (item.qty || 1));
      }
      let topProduct = "Chưa có";
      let maxQty = 0;
      for (const [name, qty] of itemMap.entries()) {
        if (qty > maxQty) {
          maxQty = qty;
          topProduct = name;
        }
      }

      return {
        staff: staffName,
        role: staffRole,
        revenue,
        orders,
        topProduct,
      };
    });

    // 6. Xây dựng biểu đồ cột số lượng bán theo ngày (dailySalesVolume)
    const dailyVolumeMap = new Map((facet.dailyVolume || []).map((d) => [d._id, safeNumber(d.qty)]));
    const dailySalesVolume = [];
    let totalItemsSold = 0;

    for (let time = +start; time < +end; time += DAY) {
      const dateStr = localDate(new Date(time));
      const qty = dailyVolumeMap.get(dateStr) ?? 0;
      totalItemsSold += qty;

      const label = `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
      dailySalesVolume.push({ label, value: qty });
    }

    // 7. Xây dựng bảng theo thời gian (timeSales - chia theo tuần)
    const timeSales = [];
    const orderTimeList = facet.byOrderTime || [];
    const totalDays = Math.ceil((+end - +start) / DAY);
    const numWeeks = Math.max(1, Math.ceil(totalDays / 7));

    for (let i = 0; i < numWeeks; i++) {
      const weekStart = +start + i * 7 * DAY;
      const weekEnd = Math.min(+end, weekStart + 7 * DAY);

      const startLabel = localDate(new Date(weekStart)).slice(8, 10) + "/" + localDate(new Date(weekStart)).slice(5, 7);
      const endLabelDate = new Date(weekEnd - DAY);
      const endLabel = localDate(endLabelDate).slice(8, 10) + "/" + localDate(endLabelDate).slice(5, 7);

      const period = `Tuần ${i + 1} (${startLabel} – ${endLabel})`;

      let weekRevenue = 0;
      let weekOrders = 0;
      let weekQuantity = 0;

      for (const ord of orderTimeList) {
        const orderTime = new Date(ord.createdAt).getTime();
        if (orderTime >= weekStart && orderTime < weekEnd) {
          weekRevenue += safeNumber(ord.total);
          weekOrders += 1;
          weekQuantity += safeNumber(ord.itemQty);
        }
      }

      timeSales.push({
        period,
        revenue: weekRevenue,
        orders: weekOrders,
        quantity: weekQuantity,
      });
    }

    // 8. 3 thẻ KPI
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const topCategoryItem = categorySales[0];
    const topCategory = topCategoryItem ? topCategoryItem.category : "Chưa có";
    const topCategoryShare = topCategoryItem ? topCategoryItem.share : "0% tổng doanh thu";

    const periodLabel = `${dateFrom.slice(8, 10)}/${dateFrom.slice(5, 7)}/${dateFrom.slice(0, 4)} – ${dateTo.slice(8, 10)}/${dateTo.slice(5, 7)}/${dateTo.slice(0, 4)}`;

    return response.status(200).json({
      success: true,
      data: {
        period: periodLabel,
        kpis: {
          itemsSold: totalItemsSold,
          itemsSoldDetail: `Trong ${totalOrders} đơn hoàn tất`,
          averageOrderValue,
          averageOrderDetail: `${totalRevenue.toLocaleString("vi-VN")} ₫ / ${totalOrders} đơn`,
          topCategory,
          topCategoryShare,
        },
        dailySalesVolume,
        productSales,
        categorySales,
        staffSales,
        timeSales,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return response.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }
    return response.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Lỗi tính toán báo cáo bán hàng" },
    });
  }
}

