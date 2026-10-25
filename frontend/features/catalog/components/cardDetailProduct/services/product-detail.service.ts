
// Service gọi API lấy thông tin chi tiết một sản phẩm

import type { GetProductDetailResponse } from "../../listProduct/types";

export async function fetchProductDetailApi(
  id: string
): Promise<GetProductDetailResponse> {
  const url = `/api/v1/catalog/products/${encodeURIComponent(id)}`;

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
