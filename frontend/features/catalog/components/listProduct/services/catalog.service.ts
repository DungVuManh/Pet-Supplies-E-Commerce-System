
import type {
  CatalogFilter,
  GetBrandsResponse,
  GetCategoriesResponse,
  GetProductDetailResponse,
  GetProductsResponse,
} from "../types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";


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
  params.set("page", String(filter.page));

  const url = `${BASE_URL}/api/v1/catalog/products?${params.toString()}`;
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
  const url = `${BASE_URL}/api/v1/catalog/categories`;
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
  const url = `${BASE_URL}/api/v1/catalog/brands`;
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
  const url = `${BASE_URL}/api/v1/catalog/products/${encodeURIComponent(id)}`;
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
