import { apiGet } from "@/lib/api-client";
import type { AdminProductRow, Page, ProductCounts, ProductFilter } from "../types";

export function listProducts(query: ProductFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminProductRow, ProductCounts>>("/api/v1/admin/products", query, { signal });
}
