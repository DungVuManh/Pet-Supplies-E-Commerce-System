import { apiGet, apiSend } from "@/lib/api-client";
import type { AdminCategoryDetail, AdminCategoryRow, CategoryFilter, Page } from "../types";

export function listCategories(query: CategoryFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminCategoryRow, { all: number }>>("/api/v1/admin/categories", query, { signal });
}

/** The changed fields, plus the `updatedAt` the form was loaded with. */
export type CategoryEdit = Partial<Pick<AdminCategoryDetail, "name" | "slug" | "description">> & {
  expectedUpdatedAt: string;
  displayOrder?: number;
  isActive?: boolean;
};

export function updateCategory(ref: string, edit: CategoryEdit) {
  return apiSend<AdminCategoryDetail & { changed: boolean }>("PATCH", `/api/v1/admin/categories/${encodeURIComponent(ref)}`, edit);
}

export function deleteCategory(ref: string) {
  return apiSend<{ id: string }>("DELETE", `/api/v1/admin/categories/${encodeURIComponent(ref)}`);
}
