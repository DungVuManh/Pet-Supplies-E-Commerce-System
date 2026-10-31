// Service gọi API lấy thông tin chi tiết và đánh giá sản phẩm

import type { GetProductDetailResponse } from "../../listProduct/types";
import type { GetProductReviewsResponse } from "../types";

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

export async function fetchProductDetailApi(
  id: string
): Promise<GetProductDetailResponse> {
  const url = `${getApiBase()}/products/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Gọi API thật lấy danh sách đánh giá & thống kê của sản phẩm (hỗ trợ cả rewrite proxy và direct fallback)
 */
export async function fetchProductReviewsApi(
  id: string,
  params?: {
    rating?: string;
    hasImages?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  }
): Promise<GetProductReviewsResponse> {
  const search = new URLSearchParams();
  if (params?.rating && params.rating !== "all") search.set("rating", params.rating);
  if (params?.hasImages) search.set("hasImages", "true");
  if (params?.sort) search.set("sort", params.sort);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));

  const query = search.toString() ? `?${search.toString()}` : "";
  const relativePath = `/api/v1/catalog/products/${encodeURIComponent(id)}/reviews${query}`;

  try {
    const response = await fetch(relativePath, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("[fetchProductReviewsApi] Gọi qua relative proxy thất bại, thử gọi direct:", err);
  }

  // Fallback direct URL khi chạy môi trường dev
  const directBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const directUrl = `${directBase.replace(/\/+$/, "")}${relativePath}`;
  const directRes = await fetch(directUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!directRes.ok) {
    throw new Error(`Lỗi server: ${directRes.status} ${directRes.statusText}`);
  }

  return directRes.json();
}
