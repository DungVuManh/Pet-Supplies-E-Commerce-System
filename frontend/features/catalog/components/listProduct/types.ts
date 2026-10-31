// =============================================================
// features/catalog/components/listProduct/types.ts
// Feature types: Định nghĩa kiểu dữ liệu cho tính năng AllProduct (listProduct)
// =============================================================

// Biến thể sản phẩm (SKU, giá, tồn kho)
export type ProductVariant = {
  sku: string;
  label: string;
  price: number;
  stock: number;
};

// Sản phẩm lấy từ API
export type CatalogProduct = {
  _id: string;
  name: string;
  brand: string;
  description: string;
  petType: string;
  category: string;
  categorySlug: string;
  image: string;
  images: string[];
  price: number;
  variants: ProductVariant[];
  ratingAvg: number;
  ratingCount: number;
  isActive: boolean;
};

// Thông tin phân trang từ API
export type Pagination = {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

// Kết quả API lấy danh sách sản phẩm
export type GetProductsResponse = {
  success: boolean;
  data: {
    products: CatalogProduct[];
    pagination: Pagination;
  };
};

// Danh mục sản phẩm
export type CatalogCategory = {
  _id: string;
  name: string;
  slug: string;
};

// Kết quả API lấy danh mục
export type GetCategoriesResponse = {
  success: boolean;
  data: {
    categories: CatalogCategory[];
  };
};

// Kết quả API lấy thương hiệu
export type GetBrandsResponse = {
  success: boolean;
  data: {
    brands: string[];
  };
};

// Trạng thái bộ lọc tìm kiếm & phân trang
export type CatalogFilter = {
  search: string;
  category: string;
  brands: string[];
  priceRanges: string[];
  sort: string;
  page: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
};

// Kết quả API lấy chi tiết một sản phẩm
export type GetProductDetailResponse = {
  success: boolean;
  data: {
    product: CatalogProduct & {
      inStock: boolean;
      totalStock: number;
    };
  };
};
