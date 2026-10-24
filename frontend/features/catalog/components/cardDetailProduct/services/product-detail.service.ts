
// Service gọi API lấy thông tin chi tiết một sản phẩm

import type { GetProductDetailResponse } from "../../listProduct/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchProductDetailApi(
  id: string
): Promise<GetProductDetailResponse> {
  const url = `${BASE_URL}/api/v1/catalog/products/${encodeURIComponent(id)}`;

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
