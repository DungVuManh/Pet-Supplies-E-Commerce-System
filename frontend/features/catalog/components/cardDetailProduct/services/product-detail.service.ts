// Service gọi API lấy thông tin chi tiết một sản phẩm

import type { GetProductDetailResponse } from "../../listProduct/types";

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
