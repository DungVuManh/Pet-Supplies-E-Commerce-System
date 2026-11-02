import { apiGet, apiSend } from "@/lib/api-client";
import type { AdminProductDetail, AdminProductRow, Page, ProductCounts, ProductFilter, ProductOptions, ProductVisibilityResult } from "../types";

export function listProducts(query: ProductFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminProductRow, ProductCounts>>("/api/v1/admin/products", query, { signal });
}

/** The changed fields only. `expectedStock` goes with a stock change; null clears cost or threshold. */
export type ProductEdit = {
  name?: string; sku?: string; brand?: string; petType?: string; categoryCodes?: string[]; description?: string; unit?: string; isActive?: boolean;
  price?: number; cost?: number | null; stock?: number; expectedStock?: number; lowStockThreshold?: number | null;
};

export function updateProduct(sku: string, edit: ProductEdit) {
  return apiSend<AdminProductDetail & { changed: boolean }>("PATCH", `/api/v1/admin/products/${encodeURIComponent(sku)}`, edit);
}

export function deleteProduct(sku: string) {
  return apiSend<{ sku: string }>("DELETE", `/api/v1/admin/products/${encodeURIComponent(sku)}`);
}

export function getProductOptions(signal: AbortSignal) {
  return apiGet<ProductOptions>("/api/v1/admin/master-data/options", undefined, { signal });
}

export function hideProduct(sku: string) {
  return apiSend<ProductVisibilityResult>("POST", `/api/v1/admin/products/${encodeURIComponent(sku)}/hide`);
}

export function showProduct(sku: string) {
  return apiSend<ProductVisibilityResult>("POST", `/api/v1/admin/products/${encodeURIComponent(sku)}/show`);
}
