// =============================================================
// features/reviews/services/review.service.ts
// Service gọi API Đánh giá của tôi (lấy danh sách, tạo, sửa, xóa, upload Cloudinary)
// =============================================================

import type {
  CreateReviewPayload,
  MyReviewsData,
  UpdateReviewPayload,
  UserReview,
} from "../types";

const API_BASE = "/api/v1/reviews";

/**
 * 1. Lấy danh sách đánh giá của tôi (cả chưa đánh giá và đã đánh giá)
 */
export async function getMyReviewsApi(): Promise<MyReviewsData> {
  const response = await fetch(`${API_BASE}/my-reviews`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Không thể tải danh sách đánh giá.");
  }

  return json.data;
}

/**
 * 2. Tải lên 1 hoặc 2 ảnh lên Cloudinary thông qua backend an toàn
 */
export async function uploadReviewImagesApi(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return [];

  const formData = new FormData();
  files.slice(0, 2).forEach((file) => {
    formData.append("images", file);
  });

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Lỗi khi tải ảnh lên Cloudinary.");
  }

  return json.data?.urls || [];
}

/**
 * 3. Tạo đánh giá mới cho sản phẩm đã mua
 */
export async function createReviewApi(
  payload: CreateReviewPayload
): Promise<UserReview> {
  const response = await fetch(API_BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Không thể gửi đánh giá.");
  }

  return json.data.review;
}

/**
 * 4. Chỉnh sửa đánh giá hiện có (trong hạn 30 ngày)
 */
export async function updateReviewApi(
  reviewId: string,
  payload: UpdateReviewPayload
): Promise<UserReview> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(reviewId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Không thể cập nhật đánh giá.");
  }

  return json.data.review;
}

/**
 * 5. Xóa đánh giá
 */
export async function deleteReviewApi(reviewId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Không thể xóa đánh giá.");
  }
}
