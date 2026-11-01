import type {
  CatalogFilter,
  GetBrandsResponse,
  GetCategoriesResponse,
  GetProductDetailResponse,
  GetProductsResponse,
} from "../types";

// Trình duyệt (Client) dùng relative URL để qua Next.js rewrite proxy
// Máy chủ (Server Component / SSR) dùng absolute URL (BACKEND_ORIGIN) vì Node fetch không hỗ trợ relative URL
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "/api/v1/catalog";
  }
  const origin =
    process.env.BACKEND_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3001";
  return `${origin.replace(/\/+$/, "")}/api/v1/catalog`;
}

export async function getProductsApi(
  filter: CatalogFilter
): Promise<GetProductsResponse> {
  const params = new URLSearchParams();

  if (filter.search) params.set("search", filter.search);
  if (filter.category && filter.category !== "all") {
    params.set("category", filter.category);
  }
  if (filter.petType && filter.petType !== "all") {
    params.set("petType", filter.petType);
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

  const url = `${getApiBase()}/products?${params.toString()}`;
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
  return data;
}

/**
 * 2. Gọi API lấy danh sách danh mục cho bộ lọc sidebar
 */
export async function getCategoriesApi(petType?: string): Promise<GetCategoriesResponse> {
  const query = petType && petType !== "all" ? `?petType=${encodeURIComponent(petType)}` : "";
  const url = `${getApiBase()}/categories${query}`;
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
  return data;
}

/**
 * 3. Gọi API lấy danh sách thương hiệu cho bộ lọc sidebar
 */
export async function getBrandsApi(): Promise<GetBrandsResponse> {
  const url = `${getApiBase()}/brands`;
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
  return data;
}

/**
 * 4. Gọi API lấy thông tin chi tiết một sản phẩm khi click card
 */
export async function getProductDetailApi(
  id: string
): Promise<GetProductDetailResponse> {
  const url = `${getApiBase()}/products/${encodeURIComponent(id)}`;
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
  return data;
}
