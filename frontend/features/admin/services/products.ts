import { apiGet, apiSend } from "@/lib/api-client";
import type { AdminProductRow, Page, ProductCounts, ProductFilter, ProductVisibilityResult } from "../types";

export function listProducts(query: ProductFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminProductRow, ProductCounts>>("/api/v1/admin/products", query, { signal });
}

export function hideProduct(sku: string) {
  return apiSend<ProductVisibilityResult>("POST", `/api/v1/admin/products/${encodeURIComponent(sku)}/hide`);
}

export function showProduct(sku: string) {
  return apiSend<ProductVisibilityResult>("POST", `/api/v1/admin/products/${encodeURIComponent(sku)}/show`);
}
