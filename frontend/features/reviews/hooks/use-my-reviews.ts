// =============================================================
// features/reviews/hooks/use-my-reviews.ts
// Hook quản lý dữ liệu, tabs, tạo/sửa/xóa đánh giá cho khách hàng
// =============================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createReviewApi,
  deleteReviewApi,
  getMyReviewsApi,
  updateReviewApi,
} from "../services/review.service";
import type {
  CreateReviewPayload,
  MyReviewsData,
  UnreviewedProduct,
  UpdateReviewPayload,
  UserReview,
} from "../types";

export type ReviewTab = "unreviewed" | "reviewed";

export function useMyReviews() {
  const [activeTab, setActiveTab] = useState<ReviewTab>("unreviewed");
  const [data, setData] = useState<MyReviewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // State điều khiển Modal đánh giá (tạo mới hoặc sửa)
  const [reviewingItem, setReviewingItem] = useState<UnreviewedProduct | null>(null);
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getMyReviewsApi();
      setData(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách đánh giá.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Tạo đánh giá mới
  const handleCreateReview = useCallback(
    async (payload: CreateReviewPayload) => {
      try {
        setIsSubmitting(true);
        const newReview = await createReviewApi(payload);
        showToast("Đánh giá sản phẩm thành công! Cảm ơn bạn.", "success");
        setReviewingItem(null);

        // Cập nhật state lạc quan: chỉ xóa đúng sản phẩm của đơn hàng vừa đánh giá
        setData((prev) => {
          if (!prev) return prev;
          const nextUnreviewed = prev.unreviewed.filter(
            (item) =>
              !(
                item.productId === payload.productId &&
                (!payload.orderId || item.orderId === payload.orderId)
              )
          );
          const nextReviewed = [newReview, ...prev.reviewed];
          return {
            unreviewed: nextUnreviewed,
            reviewed: nextReviewed,
            counts: {
              unreviewed: nextUnreviewed.length,
              reviewed: nextReviewed.length,
            },
          };
        });

        // Tự động chuyển sang tab Đã đánh giá để người dùng thấy ngay review của mình
        setActiveTab("reviewed");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Không thể gửi đánh giá.";
        showToast(msg, "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [showToast]
  );

  // Chỉnh sửa đánh giá
  const handleUpdateReview = useCallback(
    async (reviewId: string, payload: UpdateReviewPayload) => {
      try {
        setIsSubmitting(true);
        const updated = await updateReviewApi(reviewId, payload);
        showToast("Cập nhật đánh giá thành công!", "success");
        setEditingReview(null);

        setData((prev) => {
          if (!prev) return prev;
          const nextReviewed = prev.reviewed.map((r) =>
            r._id === reviewId ? { ...r, ...updated } : r
          );
          return {
            ...prev,
            reviewed: nextReviewed,
          };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Không thể cập nhật đánh giá.";
        showToast(msg, "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [showToast]
  );

  // Xóa đánh giá
  const handleDeleteReview = useCallback(
    async (reviewId: string) => {
      try {
        await deleteReviewApi(reviewId);
        showToast("Đã xóa đánh giá.", "success");

        setData((prev) => {
          if (!prev) return prev;
          const nextReviewed = prev.reviewed.filter((r) => r._id !== reviewId);
          return {
            ...prev,
            reviewed: nextReviewed,
            counts: {
              ...prev.counts,
              reviewed: nextReviewed.length,
            },
          };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Không thể xóa đánh giá.";
        showToast(msg, "error");
      }
    },
    [showToast]
  );

  return {
    activeTab,
    setActiveTab,
    data,
    isLoading,
    error,
    isSubmitting,
    toastMessage,
    reviewingItem,
    setReviewingItem,
    editingReview,
    setEditingReview,
    reload: fetchReviews,
    handleCreateReview,
    handleUpdateReview,
    handleDeleteReview,
  };
}

