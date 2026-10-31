
import type {
  CatalogFilter,
  GetBrandsResponse,
  GetCategoriesResponse,
  GetProductDetailResponse,
  GetProductsResponse,
} from "../types";

// Luôn dùng relative URL để đi qua Next.js rewrite proxy → tránh CORS & đảm bảo filter category hoạt động đúng
const API_BASE = "/api/v1/catalog";


export async function getProductsApi(
  filter: CatalogFilter
): Promise<GetProductsResponse> {
  const params = new URLSearchParams();

  if (filter.search) params.set("search", filter.search);
  if (filter.category && filter.category !== "all") {
    params.set("category", filter.category);
  }
  if (filter.brands.length > 0) {
    params.set("brands", filter.brands.join(","));
  }
  if (filter.priceRanges.length > 0) {
    params.set("priceRanges", filter.priceRanges.join(","));
  }
  if (filter.sort && filter.sort !== "default") {
    params.set("sort", filter.sort);
  }
  if (filter.minPrice !== undefined && filter.minPrice !== null && filter.minPrice > 0) {
    params.set("minPrice", String(filter.minPrice));
  }
  if (filter.maxPrice !== undefined && filter.maxPrice !== null && filter.maxPrice < 10000000) {
    params.set("maxPrice", String(filter.maxPrice));
  }
  params.set("page", String(filter.page));
  params.set("limit", String(filter.limit || 20));

  const url = `${API_BASE}/products?${params.toString()}`;
  console.log("[CatalogService] GET Products URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    console.error(
      "[CatalogService] Lỗi khi lấy sản phẩm:",
      response.status,
      response.statusText
    );
    throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
  }

  const data: GetProductsResponse = await response.json();
  // console.log(
  //   `[CatalogService] Nhận được ${data.data.pagination.totalProducts} sản phẩm | Trang ${data.data.pagination.currentPage}/${data.data.pagination.totalPages}`
  // );
  return data;
}

/**
 * 2. Gọi API lấy danh sách danh mục cho bộ lọc sidebar
 */
export async function getCategoriesApi(): Promise<GetCategoriesResponse> {
  const url = `${API_BASE}/categories`;
  console.log("[CatalogService] GET Categories URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    console.error(
      "[CatalogService] Lỗi khi lấy danh mục:",
      response.status,
      response.statusText
    );
    throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
  }

  const data: GetCategoriesResponse = await response.json();
  // console.log("[CatalogService] Danh mục nhận được:", data.data.categories);
  return data;
}

/**
 * 3. Gọi API lấy danh sách thương hiệu cho bộ lọc sidebar
 */
export async function getBrandsApi(): Promise<GetBrandsResponse> {
  const url = `${API_BASE}/brands`;
  console.log("[CatalogService] GET Brands URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    console.error(
      "[CatalogService] Lỗi khi lấy thương hiệu:",
      response.status,
      response.statusText
    );
    throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
  }

  const data: GetBrandsResponse = await response.json();
  // console.log("[CatalogService] Thương hiệu nhận được:", data.data.brands);
  return data;
}

/**
 * 4. Gọi API lấy thông tin chi tiết một sản phẩm khi click card
 */
export async function getProductDetailApi(
  id: string
): Promise<GetProductDetailResponse> {
  const url = `${API_BASE}/products/${encodeURIComponent(id)}`;
  console.log("[CatalogService] GET Product Detail URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      "[CatalogService] Lỗi khi lấy chi tiết sản phẩm:",
      response.status,
      response.statusText
    );
    throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
  }

  const data: GetProductDetailResponse = await response.json();
  // console.log("[CatalogService] Chi tiết sản phẩm nhận được:", data.data.product);
  return data;
}
