import { AppError } from "../common/errors/app-error.js";
import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";

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
        mongoFilter.categoryId = foundCategory._id;
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
      .populate("categoryId", "name slug")
      .sort({ updatedAt: -1 })
      .lean();

    const allCategoriesDocs = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    const categories = allCategoriesDocs.map((c) => c.name);

    // Flatten products into variant items for staff table view
    let items = [];
    let totalActive = 0;
    let totalHidden = 0;

    for (const prod of products) {
      const categoryName = prod.categoryId?.name || "Chưa phân loại";
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
    const { sku } = request.params;
    if (!sku) {
      throw new AppError("Mã SKU không hợp lệ.", 400, "BAD_REQUEST");
    }

    const product = await Product.findOne({ "variants.sku": sku })
      .populate("categoryId", "name slug")
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
      category: product.categoryId?.name || "Chưa phân loại",
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
      content: product.description || "",
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

export async function getPublicProducts(request, response, next) {
  try {
    const { category, search, petType } = request.query;
    const filter = { isActive: true };

    if (category) {
      const foundCategory = await Category.findOne({
        $or: [{ name: category }, { slug: category.toLowerCase() }],
      }).lean();
      if (foundCategory) filter.categoryId = foundCategory._id;
    }

    if (petType && petType !== "all") {
      filter.petType = { $in: [petType, "all"] };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { brand: regex }];
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name slug")
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
