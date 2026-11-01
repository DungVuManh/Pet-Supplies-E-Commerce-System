// =============================================================
// features/reviews/components/review-modal.tsx
// Modal tạo đánh giá mới hoặc chỉnh sửa đánh giá hiện có
// Thiết kế chuẩn form 5 sao, nhận xét chữ, nút hành động
// =============================================================

"use client";

import Image from "next/image";
import { Star, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import type {
  CreateReviewPayload,
  UnreviewedProduct,
  UpdateReviewPayload,
  UserReview,
} from "../types";

interface ReviewModalProps {
  unreviewedItem: UnreviewedProduct | null;
  editingReview: UserReview | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitCreate: (payload: CreateReviewPayload) => Promise<void>;
  onSubmitUpdate: (reviewId: string, payload: UpdateReviewPayload) => Promise<void>;
}

const RATING_TEXTS: Record<number, string> = {
  1: "Rất tệ",
  2: "Không hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Tuyệt vời",
};

export function ReviewModal({
  unreviewedItem,
  editingReview,
  isSubmitting,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: ReviewModalProps) {
  const isEditing = Boolean(editingReview);

  // Form states
  const [rating, setRating] = useState<number>(editingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(editingReview?.comment || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingReview) {
      setRating(editingReview.rating);
      setComment(editingReview.comment || "");
    } else {
      setRating(5);
      setComment("");
    }
    setErrorMsg(null);
  }, [editingReview, unreviewedItem]);

  // Đóng modal bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  if (!unreviewedItem && !editingReview) return null;

  const productName = editingReview?.productName || unreviewedItem?.productName || "Sản phẩm";
  const productImage = editingReview?.productImage || unreviewedItem?.productImage || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (rating < 1 || rating > 5) {
      setErrorMsg("Vui lòng chọn số sao từ 1 đến 5.");
      return;
    }

    try {
      if (isEditing && editingReview) {
        await onSubmitUpdate(editingReview._id, {
          rating,
          comment: comment.trim(),
        });
      } else if (unreviewedItem) {
        await onSubmitCreate({
          productId: unreviewedItem.productId,
          rating,
          comment: comment.trim(),
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    }
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Đóng cửa sổ"
          className="absolute right-5 top-5 rounded-full p-1.5 text-muted hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {/* Tiêu đề Modal */}
        <h2 id="review-modal-title" className="text-lg font-bold text-ink">
          {isEditing ? "Chỉnh sửa đánh giá" : "Đánh giá sản phẩm"}
        </h2>
        <p className="mt-1 text-xs text-muted">
          Chia sẻ trải nghiệm của bạn để giúp cộng đồng người yêu thú cưng có lựa chọn tốt hơn.
        </p>

        {/* Thông tin sản phẩm đang đánh giá */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-canvas p-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
            {productImage ? (
              <Image
                src={productImage}
                alt={productName}
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg">
                📦
              </div>
            )}
          </div>
          <span className="line-clamp-2 text-xs font-semibold text-ink">
            {productName}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Chọn số sao */}
          <div className="text-center">
            <span className="text-xs font-medium text-slate-500">Chất lượng sản phẩm</span>
            <div className="mt-2 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                  aria-label={`${star} sao`}
                >
                  <Star
                    className={`size-8 transition-colors ${
                      star <= currentDisplayRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200 fill-slate-100"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs font-bold text-amber-600 min-h-[18px]">
              {RATING_TEXTS[currentDisplayRating] || ""}
            </p>
          </div>

          {/* Ô nhập bình luận */}
          <div>
            <label htmlFor="review-comment" className="block text-xs font-bold text-ink mb-1.5">
              Nhận xét chi tiết (không bắt buộc)
            </label>
            <textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Hãy chia sẻ cảm nhận của bạn về chất lượng sản phẩm, bao bì đóng gói, hoặc phản ứng của bé cưng khi dùng nhé..."
              maxLength={1000}
              className="w-full rounded-2xl border border-line bg-canvas p-3.5 text-xs text-ink placeholder:text-muted focus:border-brand focus:bg-surface focus:outline-none transition-colors"
            />
            <div className="mt-1 text-right text-[11px] text-muted">
              {comment.length}/1000 ký tự
            </div>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Nút hủy & gửi */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-line/60">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-canvas transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? "Đang gửi..."
                : isEditing
                ? "Lưu thay đổi"
                : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

