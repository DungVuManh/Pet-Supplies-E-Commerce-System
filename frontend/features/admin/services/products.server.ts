import "server-only";
import { serverGet } from "@/lib/server-api";
import type { AdminProductDetail } from "../types";

/** Renders the not-found page for an unknown SKU; call it inside a Suspense child. */
export function getProduct(sku: string) {
  return serverGet<AdminProductDetail>(`/api/v1/admin/products/${encodeURIComponent(sku)}`);
}
