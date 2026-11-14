import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { User } from "../models/user.model.js";
import { Order } from "../models/order.model.js";
import { parseProductSku } from "../validators/product.validator.js";

function formatTimestamp(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} · ${hours}:${minutes}`;
}

export async function getStaffProducts(request, response, next) {
  try {
    const { query = "", category = "all", status = "all", stock = "all" } = request.query;

    const mongoFilter = {};

    if (status === "active") {
      mongoFilter.isActive = true;
    } else if (status === "hidden") {
      mongoFilter.isActive = false;
    }

    if (category && category !== "all") {
      const foundCategory = await Category.findOne({
        $or: [{ name: category }, { slug: category.toLowerCase() }],
      }).lean();
      if (foundCategory) {
        mongoFilter.categoryIds = foundCategory._id;
      }
    }

    if (query && query.trim()) {
      const cleanQuery = query.trim();
      const regex = new RegExp(cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      mongoFilter.$or = [
        { name: regex },
        { brand: regex },
        { "variants.sku": regex },
      ];
    }

    const products = await Product.find(mongoFilter)
      .populate("categoryIds", "name slug")
      .sort({ updatedAt: -1 })
      .lean();

    const allCategoriesDocs = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    const categories = allCategoriesDocs.map((c) => c.name);

    // Flatten products into variant items for staff table view
    let items = [];
    let totalActive = 0;
    let totalHidden = 0;

    for (const prod of products) {
      const categoryName = prod.categoryIds?.[0]?.name || prod.categoryId?.name || "Chưa phân loại";
      const isItemActive = Boolean(prod.isActive);

      if (isItemActive) {
        totalActive += prod.variants?.length || 1;
      } else {
        totalHidden += prod.variants?.length || 1;
      }

      for (const variant of prod.variants || []) {
        const physical = variant.stock ?? 0;
        const reserved = variant.reservedStock ?? 0;
        const available = physical - reserved;
        const threshold = 10;

        let stockCondition = "available";
        if (available === 0) {
          stockCondition = "out";
        } else if (available <= threshold) {
          stockCondition = "low";
        }

        // Apply stock filter if specified
        if (stock !== "all" && stockCondition !== stock) {
          continue;
        }

        items.push({
          productId: prod._id,
          sku: variant.sku,
          name: prod.name,
          category: categoryName,
          brand: prod.brand || "",
          weight: variant.label,
          price: variant.price,
          physical,
          reserved,
          availableStock: available,
          threshold,
          stockStatus: stockCondition,
          status: isItemActive ? "active" : "hidden",
          image: prod.images?.[0] || "/images/products/royal-canin-mini-adult.png",
          updated: formatTimestamp(prod.updatedAt),
          description: prod.description || "",
          ratingAvg: prod.ratingAvg || 0,
          ratingCount: prod.ratingCount || 0,
        });
      }
    }

    response.json({
      success: true,
      data: {
        items,
        categories,
        summary: {
          totalProducts: items.length,
          totalActive,
          totalHidden,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductBySku(request, response, next) {
  try {
    const sku = parseProductSku(request.params);

    const product = await Product.findOne({ "variants.sku": sku })
      .populate("categoryIds", "name slug")
      .lean();

    if (!product) {
      throw new AppError("Không tìm thấy sản phẩm với mã SKU này.", 404, "NOT_FOUND");
    }

    const variant = product.variants.find((v) => v.sku === sku);
    const physical = variant?.stock ?? 0;
    const reserved = variant?.reservedStock ?? 0;

    const data = {
      productId: product._id,
      sku: variant?.sku || sku,
      name: product.name,
      category: product.categoryIds?.[0]?.name || "Chưa phân loại",
      categories: (product.categoryIds || []).map((c) => ({ _id: c._id, name: c.name, slug: c.slug })),
      categoryIds: (product.categoryIds || []).map((c) => c._id || c),
      brand: product.brand || "",
      weight: variant?.label || "",
      price: variant?.price || 0,
      physical,
      reserved,
      availableStock: physical - reserved,
      threshold: 10,
      location: "Kệ A1",
      status: product.isActive ? "active" : "hidden",
      image: product.images?.[0] || "/images/products/royal-canin-mini-adult.png",
      updated: formatTimestamp(product.updatedAt),
      shortDescription: product.description || "",
      description: product.description || "",
      content: product.description || "",
      ratingAvg: product.ratingAvg || 0,
      ratingCount: product.ratingCount || 0,
      variants: product.variants,
    };

    response.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/staff/products/:sku/reviews
 * Lấy danh sách đánh giá từ khách hàng của một sản phẩm dành cho Staff
 */
export async function getStaffProductReviews(request, response, next) {
  try {
    const sku = parseProductSku(request.params);
    const { rating, hasImages, sort = "recent", page = 1, limit = 10 } = request.query;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(sku)) {
      product = await Product.findById(sku).lean();
    }
    if (!product) {
      product = await Product.findOne({ "variants.sku": sku }).lean();
    }
    if (!product) {
      product = await Product.findOne({ _id: sku }).lean();
    }

    if (!product) {
      throw new AppError("Không tìm thấy sản phẩm với mã SKU này.", 404, "NOT_FOUND");
    }

    const productId = product._id;

    // 1. Lấy tất cả reviews đã published của sản phẩm để thống kê
    const allReviews = await Review.find({
      productId,
      status: "published",
    })
      .populate({
        path: "userId",
        select: "fullName email phone",
        model: User,
      })
      .populate({
        path: "orderId",
        select: "orderCode",
        model: Order,
      })
      .sort({ createdAt: -1 })
      .lean();

    const totalFromDb = allReviews.length;
    const avgRating = totalFromDb > 0
      ? Number((allReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / totalFromDb).toFixed(1))
      : (product.ratingAvg ? Number(product.ratingAvg.toFixed(1)) : 0);

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of allReviews) {
      const star = r.rating || 5;
      if (counts[star] !== undefined) {
        counts[star]++;
      }
    }

    const breakdown = {};
    for (let s = 5; s >= 1; s--) {
      const c = counts[s];
      const percentage = totalFromDb > 0 ? Math.round((c / totalFromDb) * 100) : 0;
      breakdown[s] = { count: c, percentage };
    }

    // 2. Lọc danh sách reviews theo query
    let filtered = [...allReviews];

    if (rating && rating !== "all") {
      const ratingNum = Number(rating);
      filtered = filtered.filter((r) => r.rating === ratingNum);
    }

    if (hasImages === "true") {
      filtered = filtered.filter((r) => Array.isArray(r.images) && r.images.length > 0);
    }

    // 3. Sắp xếp
    if (sort === "rating_desc") {
      filtered.sort((a, b) => (b.rating || 5) - (a.rating || 5) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sort === "rating_asc") {
      filtered.sort((a, b) => (a.rating || 5) - (b.rating || 5) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else {
      // recent: mới nhất lên đầu
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    // 4. Phân trang
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    const formattedReviews = paginated.map((r) => {
      const user = r.userId && typeof r.userId === "object" ? r.userId : {};
      const order = r.orderId && typeof r.orderId === "object" ? r.orderId : {};

      return {
        id: (r._id || "").toString(),
        rating: r.rating || 5,
        author: {
          id: user._id ? user._id.toString() : (typeof r.userId === "string" ? r.userId : ""),
          fullName: user.fullName || "Khách hàng",
          email: user.email || "",
          phone: user.phone || "",
        },
        order: order._id ? {
          id: order._id.toString(),
          orderCode: order.orderCode || "",
        } : (r.orderId ? { id: r.orderId.toString(), orderCode: "" } : undefined),
        comment: r.comment || "",
        images: Array.isArray(r.images) ? r.images : [],
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
      };
    });

    response.json({
      success: true,
      data: {
        summary: {
          averageRating: avgRating,
          totalReviews: totalFromDb,
          breakdown,
        },
        reviews: formattedReviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(filtered.length / limitNum) || (filtered.length === 0 ? 0 : 1),
          totalReviews: filtered.length,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicProducts(request, response, next) {
  try {
    const { category, search, petType } = request.query;
    const filter = { isActive: true };

    if (category) {
      const foundCategory = await Category.findOne({
        $or: [{ name: category }, { slug: category.toLowerCase() }],
      }).lean();
      if (foundCategory) filter.categoryIds = foundCategory._id;
    }

    if (petType && petType !== "all") {
      filter.petType = { $in: [petType, "all"] };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { brand: regex }];
    }

    const products = await Product.find(filter)
      .populate("categoryIds", "name slug")
      .sort({ updatedAt: -1 })
      .lean();

    response.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    next(error);
  }
}
