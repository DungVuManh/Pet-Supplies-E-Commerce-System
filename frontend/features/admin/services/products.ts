import { apiGet, apiSend } from "@/lib/api-client";
import { apiUpload } from "@/lib/api-upload";
import type { AdminProductDetail, AdminProductRow, ExportPage, Page, ProductCounts, ProductFilter, ProductOptions, ProductVisibilityResult } from "../types";

export function listProducts(query: ProductFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminProductRow, ProductCounts>>("/api/v1/admin/products", query, { signal });
}

/** The changed fields only. `expectedStock` goes with a stock change; null clears cost or threshold. */
export type ProductEdit = {
  name?: string; sku?: string; brand?: string; petType?: string; categoryCodes?: string[]; description?: string; unit?: string; isActive?: boolean;
  price?: number; cost?: number | null; stock?: number; expectedStock?: number; lowStockThreshold?: number | null; images?: string[];
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

/** One variant of a new product. Empty cost and threshold are left out, so the global threshold applies. */
export type ProductVariantCreate = { label: string; sku: string; price: number; cost?: number; stock: number; lowStockThreshold?: number };

/** A new product, with the URLs of photos already uploaded. */
export type ProductCreate = {
  name: string; brand: string; petType: string; categoryCodes: string[]; description: string; unit: string; isActive: boolean; images: string[];
  variants: ProductVariantCreate[];
};

/** Returns the first variant's detail, which is where the new page goes next. */
export function createProduct(product: ProductCreate) {
  return apiSend<AdminProductDetail>("POST", "/api/v1/admin/products", product);
}

/** Every row the list would show for this filter, across pages, up to the server's limit. */
export function exportProducts(filter: ProductFilter) {
  return apiGet<ExportPage<AdminProductRow>>("/api/v1/admin/products/export", filter);
}

/** Uploads photos to the image store; the product keeps them only when its form is saved. */
export function uploadProductImages(files: File[]) {
  const form = new FormData();
  for (const file of files) form.append("images", file);
  return apiUpload<{ urls: string[] }>("/api/v1/admin/uploads/product-images", form);
}
