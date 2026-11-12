import { AppError } from "../common/errors/app-error.js";
import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";
import { Order } from "../models/order.model.js";
import { Setting } from "../models/setting.model.js";
import { parseInventoryReportQuery } from "../validators/admin-inventory.validator.js";
import { visibleOrders, safeNumber } from "./staff-analytics.helpers.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/v1/admin/reports/inventory?dateFrom=...&dateTo=...&q=...&category=...&page=...&pageSize=...
 *
 * Trả về báo cáo tồn kho nhập – xuất – tồn từ MongoDB:
 *   1. 4 thẻ KPI: Tồn kho cuối kỳ, Nhập trong kỳ, Xuất trong kỳ, Dưới định mức.
 *   2. Danh sách phân trang các dòng SKU: Tồn đầu, Nhập, Xuất, Tồn cuối, Định mức, Cảnh báo.
 *   3. Danh sách phân loại danh mục (categories) cho dropdown bộ lọc.
 *   4. Phân trang đầy đủ (page, pageSize, total, pages, from, to).
 */
export async function getInventoryReport(request, response) {
  try {
    const { dateFrom, dateTo, start, end, q, category, page, pageSize } =
      parseInventoryReportQuery(request.query);

    // 1. Lấy định mức tồn kho tối thiểu từ Setting global
    const setting = await Setting.findById("global").lean();
    const threshold = setting?.lowStockThreshold ?? 5;

    // 2. Tra cứu số lượng xuất kho từ các đơn hàng hợp lệ trong kỳ
    const orderMatch = {
      ...visibleOrders,
      orderStatus: { $nin: ["cancelled", "returned"] },
      createdAt: { $gte: start, $lt: end },
    };

    const orderOutAgg = await Order.aggregate([
      { $match: orderMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.variantSku",
          outQty: { $sum: "$items.qty" },
          orderIds: { $addToSet: "$_id" },
        },
      },
    ]);

    const skuOutMap = new Map(orderOutAgg.map((o) => [o._id, safeNumber(o.outQty)]));

    // Tổng số đơn hàng và tổng số lượng xuất kho trong kỳ
    let outTotal = 0;
    const allOutOrderIds = new Set();
    for (const item of orderOutAgg) {
      outTotal += safeNumber(item.outQty);
      for (const orderId of item.orderIds || []) {
        allOutOrderIds.add(orderId.toString());
      }
    }
    const outOrders = allOutOrderIds.size;

    // 3. Lấy danh sách danh mục phục vụ bộ lọc
    const categoriesDoc = await Category.find({ isActive: true }).select("name").sort({ name: 1 }).lean();
    const categories = ["Tất cả danh mục", ...categoriesDoc.map((c) => c.name)];

    // 4. Pipeline tổng hợp Product variants
    const matchProduct = { isActive: true };
    const pipeline = [
      { $match: matchProduct },
      { $unwind: "$variants" },
      // One row per SKU: a product in several categories is listed under its first one.
      { $addFields: { primaryCategoryId: { $ifNull: [{ $first: "$categoryIds" }, "$categoryId"] } } },
      {
        $lookup: {
          from: "categories",
          localField: "primaryCategoryId",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          sku: "$variants.sku",
          name: "$name",
          category: { $ifNull: ["$categoryDoc.name", "Chưa phân loại"] },
          closing: { $ifNull: ["$variants.stock", 0] },
        },
      },
      { $sort: { name: 1, sku: 1 } },
    ];

    const allVariants = await Product.aggregate(pipeline);

    // Tính toán KPI toàn bộ hệ thống
    const catalogSkus = allVariants.length;
    let closingTotal = 0;
    let lowStockCount = 0;

    for (const v of allVariants) {
      closingTotal += safeNumber(v.closing);
      if (v.closing <= threshold) {
        lowStockCount += 1;
      }
    }

    // 5. Lọc theo từ khóa tìm kiếm (q) và danh mục (category)
    let filteredVariants = allVariants;

    if (q) {
      const qLower = q.toLowerCase();
      filteredVariants = filteredVariants.filter(
        (v) =>
          v.sku.toLowerCase().includes(qLower) ||
          v.name.toLowerCase().includes(qLower)
      );
    }

    if (category && category !== "Tất cả danh mục") {
      filteredVariants = filteredVariants.filter((v) => v.category === category);
    }

    const total = filteredVariants.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const skip = (currentPage - 1) * pageSize;
    const pagedVariants = filteredVariants.slice(skip, skip + pageSize);

    // 6. Xây dựng từng dòng dữ liệu báo cáo
    const rows = pagedVariants.map((item) => {
      const closing = safeNumber(item.closing);
      const outQty = skuOutMap.get(item.sku) ?? 0;
      const inQty = 0; // Chưa có module phiếu nhập kho riêng
      const opening = closing - inQty + outQty;

      let warning = "Đủ hàng";
      if (closing === 0) {
        warning = "Hết hàng";
      } else if (closing <= threshold) {
        warning = "Sắp hết";
      }

      return {
        sku: item.sku,
        name: item.name,
        category: item.category,
        opening,
        inQty,
        outQty,
        closing,
        threshold,
        warning,
      };
    });

    const periodLabel = `${dateFrom.slice(8, 10)}/${dateFrom.slice(5, 7)}/${dateFrom.slice(0, 4)} – ${dateTo.slice(8, 10)}/${dateTo.slice(5, 7)}/${dateTo.slice(0, 4)}`;

    return response.status(200).json({
      success: true,
      data: {
        period: periodLabel,
        kpis: {
          closingTotal,
          catalogSkus,
          inTotal: 0,
          inReceipts: 0,
          outTotal,
          outOrders,
          lowStockCount,
        },
        items: rows,
        categories,
        pagination: {
          page: currentPage,
          pageSize,
          total,
          pages,
          from: total > 0 ? skip + 1 : 0,
          to: Math.min(skip + pageSize, total),
        },
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
      error: { code: "INTERNAL_ERROR", message: "Lỗi tải báo cáo tồn kho" },
    });
  }
}

