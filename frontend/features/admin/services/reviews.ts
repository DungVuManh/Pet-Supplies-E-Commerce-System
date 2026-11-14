import { apiGet, apiSend } from "@/lib/api-client";
import type { AdminReviewRow, Page, ReviewFilter } from "../types";

export function listReviews(query: ReviewFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminReviewRow>>("/api/v1/admin/reviews", query, { signal });
}

export function deleteReview(id: string) {
  return apiSend<{ id: string }>("DELETE", `/api/v1/admin/reviews/${encodeURIComponent(id)}`);
}
