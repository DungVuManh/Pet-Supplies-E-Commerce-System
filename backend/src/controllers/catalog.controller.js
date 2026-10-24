// ============================================================
// Catalog Controller - Xử lý logic cho trang danh sách sản phẩm
// Màn hình: AllProduct (allproduct.tsx)
//
// Các chức năng cần thiết:
//   1. getAllProducts  - Lấy danh sách sản phẩm (lọc + tìm kiếm + sắp xếp + phân trang)
//   2. getCategories  - Lấy danh sách danh mục (cho sidebar)
//   3. getBrands      - Lấy danh sách thương hiệu (cho sidebar)
// ============================================================

import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import { parseCatalogQuery } from "../validators/catalog.validator.js";

// ------------------------------------------------------------
// HELPER: Xây dựng điều kiện lọc theo khoảng giá
// priceRanges là chuỗi như "under-100k,100k-300k"
// Trả về mảng điều kiện MongoDB để dùng với $or
// ------------------------------------------------------------
function buildPriceFilter(priceRanges) {
  if (!priceRanges || priceRanges.trim() === "") return null;

  const ranges = priceRanges.split(",").map((r) => r.trim()).filter(Boolean);
  const conditions = [];

  for (const range of ranges) {
    if (range === "under-100k") {
      // Dưới 100.000đ: tìm sản phẩm có ít nhất 1 variant có price < 100000
      conditions.push({ "variants.price": { $lt: 100000 } });
    } else if (range === "100k-300k") {
      // 100.000đ - 300.000đ
      conditions.push({ "variants.price": { $gte: 100000, $lte: 300000 } });
    } else if (range === "above-300k") {
      // Trên 300.000đ
      conditions.push({ "variants.price": { $gt: 300000 } });
    }
  }

  return conditions.length > 0 ? conditions : null;
}

// ------------------------------------------------------------
// HELPER: Xây dựng điều kiện sort cho MongoDB
// ------------------------------------------------------------
function buildSortOption(sort) {
  switch (sort) {
    case "price-asc":
      // Sắp xếp theo giá thấp đến cao (dùng giá variant đầu tiên)
      return { "variants.0.price": 1 };
    case "price-desc":
      return { "variants.0.price": -1 };
    case "name-asc":
      return { name: 1 };
    case "name-desc":
      return { name: -1 };
    default:
      // Mặc định: sản phẩm mới nhất lên đầu
      return { updatedAt: -1 };
  }
}

// ------------------------------------------------------------
// HELPER: Format sản phẩm trả về cho frontend
// Chuyển từ format MongoDB sang format gọn hơn
// ------------------------------------------------------------
function formatProduct(product) {
  // Lấy giá thấp nhất trong các variant
  const prices = (product.variants || []).map((v) => v.price).filter((p) => p != null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

  return {
    _id: product._id,
    name: product.name,
    brand: product.brand || "",
    description: product.description || "",
    petType: product.petType,
    // Trả về tên danh mục (đã populate từ categoryId)
    category: product.categoryId?.name || "Chưa phân loại",
    categorySlug: product.categoryId?.slug || "",
    // Ảnh đầu tiên (nếu không có thì dùng ảnh mặc định)
    image: product.images?.[0] || "/images/products/default.png",
    images: product.images || [],
    // Giá hiển thị (giá thấp nhất trong các variant)
    price: minPrice,
    // Danh sách các biến thể (size, weight,...)
    variants: product.variants || [],
    ratingAvg: product.ratingAvg || 0,
    ratingCount: product.ratingCount || 0,
    isActive: product.isActive,
  };
}

// ============================================================
// 1. GET /api/v1/catalog/products
// Lấy danh sách sản phẩm cho trang catalog công khai
// Query params hỗ trợ:
//   - search    : Tìm kiếm theo tên, thương hiệu
//   - category  : Lọc theo danh mục (slug)
//   - petType   : Lọc theo loại thú cưng (dog, cat, all)
//   - brands    : Lọc theo thương hiệu (nhiều brands cách nhau dấu phẩy)
//   - priceRanges: Lọc theo khoảng giá (under-100k, 100k-300k, above-300k)
//   - sort      : Sắp xếp (default, price-asc, price-desc, name-asc, name-desc)
//   - page      : Trang hiện tại (mặc định = 1)
//   - limit     : Số sản phẩm mỗi trang (mặc định = 12)
// ============================================================
export async function getAllProducts(request, response, next) {
  try {
    // Bước 1: Kiểm tra và lấy query params
    const { search, category, petType, brands, priceRanges, sort, page, limit } =
      parseCatalogQuery(request.query);

    // Bước 2: Xây dựng bộ lọc MongoDB
    // Luôn chỉ lấy sản phẩm đang hoạt động
    const mongoFilter = { isActive: true };

    // Lọc theo danh mục
    if (category && category !== "all") {
      const foundCategory = await Category.findOne({
        $or: [{ name: category }, { slug: category.toLowerCase() }],
      }).lean();
      if (foundCategory) {
        mongoFilter.categoryId = foundCategory._id;
      }
    }

    // Lọc theo loại thú cưng
    if (petType && petType !== "all") {
      mongoFilter.petType = petType;
    }

    // Tìm kiếm theo tên hoặc thương hiệu
    if (search && search.trim()) {
      const searchRegex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), // escape ký tự đặc biệt
        "i" // không phân biệt hoa thường
      );
      mongoFilter.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { description: searchRegex },
      ];
    }

    // Lọc theo thương hiệu (có thể chọn nhiều)
    if (brands && brands.trim()) {
      const brandList = brands.split(",").map((b) => b.trim()).filter(Boolean);
      if (brandList.length > 0) {
        mongoFilter.brand = { $in: brandList };
      }
    }

    // Lọc theo khoảng giá
    const priceConditions = buildPriceFilter(priceRanges);
    if (priceConditions) {
      // Nếu chưa có $or (từ search) thì tạo mới
      // Nếu đã có $or (từ search) thì dùng $and để kết hợp
      if (mongoFilter.$or) {
        mongoFilter.$and = [{ $or: mongoFilter.$or }, { $or: priceConditions }];
        delete mongoFilter.$or;
      } else {
        mongoFilter.$or = priceConditions;
      }
    }

    // Bước 3: Xây dựng options sắp xếp
    const sortOption = buildSortOption(sort);

    // Bước 4: Tính offset cho phân trang
    const skip = (page - 1) * limit;

    // Bước 5: Truy vấn database
    // Dùng Promise.all để chạy 2 query song song cho nhanh hơn
    const [products, totalCount] = await Promise.all([
      Product.find(mongoFilter)
        .populate("categoryId", "name slug") // Lấy thêm thông tin danh mục
        .sort(sortOption)
        .skip(skip)      // Bỏ qua các sản phẩm của trang trước
        .limit(limit)    // Chỉ lấy số lượng giới hạn
        .lean(),         // Trả về plain object (nhanh hơn Mongoose Document)
      Product.countDocuments(mongoFilter), // Đếm tổng số sản phẩm khớp filter
    ]);

    // Bước 6: Format dữ liệu trả về
    const formattedProducts = products.map(formatProduct);

    // Bước 7: Trả về response
    response.json({
      success: true,
      data: {
        products: formattedProducts,
        // Thông tin phân trang để frontend biết có bao nhiêu trang
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
    next(error); // Chuyển lỗi sang error middleware xử lý
  }
}

// ============================================================
// 2. GET /api/v1/catalog/categories
// Lấy danh sách danh mục để hiển thị trong sidebar bộ lọc
// ============================================================
export async function getCategories(request, response, next) {
  try {
    // Chỉ lấy các danh mục đang hoạt động, sắp xếp theo tên
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    // Format dữ liệu trả về (chỉ lấy các trường cần thiết)
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

// ============================================================
// 3. GET /api/v1/catalog/brands
// Lấy danh sách thương hiệu duy nhất từ database
// để hiển thị trong sidebar bộ lọc
// ============================================================
export async function getBrands(request, response, next) {
  try {
    // Dùng distinct() để lấy danh sách các brand không trùng lặp
    // Chỉ lấy từ sản phẩm đang hoạt động
    const brands = await Product.distinct("brand", { isActive: true });

    // Lọc bỏ các giá trị rỗng hoặc null, rồi sắp xếp theo alphabet
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
