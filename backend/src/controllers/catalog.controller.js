//   1. getAllProducts  - Lấy danh sách sản phẩm 
//   2. getCategories  - Lấy danh sách danh mục
//   3. getBrands      - Lấy danh sách thương hiệu

import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import {
  parseCatalogQuery,
  parseProductId,
} from "../validators/catalog.validator.js";


function buildPriceFilter(priceRanges) {
  if (!priceRanges || priceRanges.trim() === "") return null;

  const ranges = priceRanges.split(",").map((r) => r.trim()).filter(Boolean);
  const conditions = [];

  for (const range of ranges) {
    if (range === "under-100k") {
      conditions.push({ "variants.price": { $lt: 100000 } });
    } else if (range === "100k-300k") {
      conditions.push({ "variants.price": { $gte: 100000, $lte: 300000 } });
    } else if (range === "above-300k") {
      // Trên 300.000đ
      conditions.push({ "variants.price": { $gt: 300000 } });
    }
  }

  return conditions.length > 0 ? conditions : null;
}


function buildSortOption(sort) {
  switch (sort) {
    case "price-asc":
      return { "variants.0.price": 1 };
    case "price-desc":
      return { "variants.0.price": -1 };
    case "name-asc":
      return { name: 1 };
    case "name-desc":
      return { name: -1 };
    default:
      return { updatedAt: -1 };
  }
}

function formatProduct(product) {
  const prices = (product.variants || []).map((v) => v.price).filter((p) => p != null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const categories = Array.isArray(product.categoryIds) ? product.categoryIds : [];
  const primaryCategory = categories[0] || {};

  return {
    _id: product._id,
    name: product.name,
    brand: product.brand || "",
    description: product.description || "",
    petType: product.petType,
    category: primaryCategory.name || "Chưa phân loại",
    categorySlug: primaryCategory.slug || "",
    categories: categories.map((c) => ({ _id: c._id, name: c.name, slug: c.slug })),
    categoryIds: categories.map((c) => c._id || c),
    image: product.images?.[0] || "/images/products/default.png",
    images: product.images || [],
    price: minPrice,
    variants: product.variants || [],
    ratingAvg: product.ratingAvg || 0,
    ratingCount: product.ratingCount || 0,
    soldCount: product.soldCount || 0,
    isActive: product.isActive,
  };
}

// 1. GET /api/catalog/products
export async function getAllProducts(request, response, next) {
  try {
    const { search, category, petType, brands, priceRanges, sort, page, limit, minPrice, maxPrice } =
      parseCatalogQuery(request.query);

    const mongoFilter = { isActive: true };

    if (category && category !== "all") {
      const foundCategory = await Category.findOne({
        $or: [{ name: category }, { slug: category.toLowerCase() }],
      }).lean();
      if (foundCategory) {
        mongoFilter.categoryIds = foundCategory._id;
      }
    }

    if (petType && petType !== "all") {
      mongoFilter.petType = petType;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      mongoFilter.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { description: searchRegex },
      ];
    }

    if (brands && brands.trim()) {
      const brandList = brands.split(",").map((b) => b.trim()).filter(Boolean);
      if (brandList.length > 0) {
        mongoFilter.brand = { $in: brandList };
      }
    }

    // Lọc theo khoảng giá
    const priceConditions = buildPriceFilter(priceRanges);
    if (priceConditions) {

      if (mongoFilter.$or) {
        mongoFilter.$and = [{ $or: mongoFilter.$or }, { $or: priceConditions }];
        delete mongoFilter.$or;
      } else {
        mongoFilter.$or = priceConditions;
      }
    }

    const sortOption = buildSortOption(sort);

    const skip = (page - 1) * limit;


    const [products, totalCount] = await Promise.all([
      Product.find(mongoFilter)
        .populate("categoryIds", "name slug")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(mongoFilter),
    ]);


    const formattedProducts = products.map(formatProduct);

    response.json({
      success: true,
      data: {
        products: formattedProducts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalProducts: totalCount,
          limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}


// 2. GET /api/catalog/categories
export async function getCategories(request, response, next) {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    const formattedCategories = categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
    }));

    response.json({
      success: true,
      data: { categories: formattedCategories },
    });
  } catch (error) {
    next(error);
  }
}

// 3. GET /api/catalog/brands
export async function getBrands(request, response, next) {
  try {
    const brands = await Product.distinct("brand", { isActive: true });

    const filteredBrands = brands
      .filter((brand) => brand && brand.trim() !== "")
      .sort((a, b) => a.localeCompare(b, "vi"));

    response.json({
      success: true,
      data: { brands: filteredBrands },
    });
  } catch (error) {
    next(error);
  }
}

// 4. GET /api/catalog/products/:id - Lấy chi tiết một sản phẩm khi click card
export async function getProductDetail(request, response, next) {
  try {
    const id = parseProductId(request.params);

    const mongoFilter = { isActive: true };
    if (mongoose.Types.ObjectId.isValid(id)) {
      mongoFilter._id = id;
    } else {
      mongoFilter["variants.sku"] = id;
    }

    const product = await Product.findOne(mongoFilter)
      .populate("categoryIds", "name slug")
      .lean();

    if (!product) {
      throw new AppError("Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng kinh doanh.", 404, "NOT_FOUND");
    }

    const variants = (product.variants || []).map((v) => {
      const stock = v.stock ?? 0;
      const reservedStock = v.reservedStock ?? 0;
      return {
        sku: v.sku,
        label: v.label,
        price: v.price,
        stock,
        reservedStock,
        availableStock: Math.max(0, stock - reservedStock),
      };
    });

    const prices = variants.map((v) => v.price).filter((p) => p != null);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const totalAvailableStock = variants.reduce((sum, v) => sum + v.availableStock, 0);

    const formattedProduct = {
      _id: product._id,
      id: product._id.toString(),
      name: product.name,
      brand: product.brand || "",
      description: product.description || "",
      petType: product.petType,
      category: (product.categoryIds?.[0]?.name) || "Chưa phân loại",
      categorySlug: (product.categoryIds?.[0]?.slug) || "",
      categories: (product.categoryIds || []).map((c) => ({ _id: c._id, name: c.name, slug: c.slug })),
      categoryIds: (product.categoryIds || []).map((c) => c._id || c),
      image: product.images?.[0] || "/images/products/royal-canin-mini-adult.png",
      images:
        product.images && product.images.length > 0
          ? product.images
          : [product.images?.[0] || "/images/products/royal-canin-mini-adult.png"],
      price: minPrice,
      variants,
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      soldCount: product.soldCount || 0,
      inStock: totalAvailableStock > 0,
      totalStock: totalAvailableStock,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    response.json({
      success: true,
      data: {
        product: formattedProduct,
      },
    });
  } catch (error) {
    next(error);
  }
}
