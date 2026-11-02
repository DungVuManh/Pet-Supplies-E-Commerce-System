import { apiGet, apiSend } from "@/lib/api-client";
import type { AdminCategoryRow, CategoryFilter, Page } from "../types";

export function listCategories(query: CategoryFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminCategoryRow, { all: number }>>("/api/v1/admin/categories", query, { signal });
}

export function deleteCategory(ref: string) {
  return apiSend<{ id: string }>("DELETE", `/api/v1/admin/categories/${encodeURIComponent(ref)}`);
}
