import "server-only";
import { serverGet } from "@/lib/server-api";
import type { AdminCategoryDetail } from "../types";

/** Renders the not-found page for an unknown code; call it inside a Suspense child. */
export function getCategory(ref: string) {
  return serverGet<AdminCategoryDetail>(`/api/v1/admin/categories/${encodeURIComponent(ref)}`);
}
