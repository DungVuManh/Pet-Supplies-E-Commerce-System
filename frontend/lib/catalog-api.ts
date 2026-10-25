// =============================================================
// lib/catalog-api.ts
// Tập hợp các hàm gọi API cho trang catalog
// Dùng fetch API gốc của browser, có console.log để debug
// =============================================================

import type {
  CatalogFilter,
  GetBrandsResponse,
  GetCategoriesResponse,
  GetProductsResponse,
} from "@/types/catalog";

// URL gốc của backend (lấy từ biến môi trường Next.js)
// Trong .env.local: NEXT_PUBLIC_API_URL=http://localhost:3001
// Nếu chưa có biến môi trường thì dùng mặc định localhost:3001
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// =============================================================
// Hàm 1: Lấy danh sách sản phẩm (có filter, sort, pagination)
// =============================================================
export async function fetchProducts(
  filter: CatalogFilter
): Promise<GetProductsResponse> {
  // Bước 1: Xây dựng query string từ bộ lọc
  // URLSearchParams giúp tạo chuỗi ?key=value&key2=value2
  const params = new URLSearchParams();

  if (filter.search) params.set("search", filter.search);
  if (filter.category && filter.category !== "all") {
    params.set("category", filter.category);
  }
  if (filter.brands.length > 0) {
    // Ghép nhiều brand thành 1 chuỗi cách nhau bằng dấu phẩy
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

  // Bước 2: In ra URL để dễ debug trên console
  console.log("[CatalogAPI] Gọi API lấy sản phẩm:", url);

  // Bước 3: Gọi API
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    // next: { revalidate: 60 } // Nếu muốn cache 60 giây (Next.js)
  });

  // Bước 4: Kiểm tra HTTP status
  if (!response.ok) {
    console.error(
      "[CatalogAPI] Lỗi HTTP khi lấy sản phẩm:",
      response.status,
      response.statusText
    );
    throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
  }

  // Bước 5: Parse JSON
  const data: GetProductsResponse = await response.json();
  console.log(
    "[CatalogAPI] Nhận được sản phẩm:",
    data.data.pagination.totalProducts,
    "sản phẩm",
    "| Trang:",
    data.data.pagination.currentPage,
    "/",
    data.data.pagination.totalPages
  );

  return data;
}

// =============================================================
// Hàm 2: Lấy danh sách danh mục (cho sidebar bộ lọc)
// =============================================================
export async function fetchCategories(): Promise<GetCategoriesResponse> {
  const url = `${BASE_URL}/api/v1/catalog/categories`;

  console.log("[CatalogAPI] Gọi API lấy danh mục:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(
      "[CatalogAPI] Lỗi HTTP khi lấy danh mục:",
      response.status,
      response.statusText
    );
    throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
  }

  const data: GetCategoriesResponse = await response.json();
  console.log(
    "[CatalogAPI] Nhận được danh mục:",
    data.data.categories.map((c) => c.name)
  );

  return data;
}

// =============================================================
// Hàm 3: Lấy danh sách thương hiệu (cho sidebar bộ lọc)
// =============================================================
export async function fetchBrands(): Promise<GetBrandsResponse> {
  const url = `${BASE_URL}/api/v1/catalog/brands`;

  console.log("[CatalogAPI] Gọi API lấy thương hiệu:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(
      "[CatalogAPI] Lỗi HTTP khi lấy thương hiệu:",
      response.status,
      response.statusText
    );
    throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
  }

  const data: GetBrandsResponse = await response.json();
  console.log("[CatalogAPI] Nhận được thương hiệu:", data.data.brands);

  return data;
}
