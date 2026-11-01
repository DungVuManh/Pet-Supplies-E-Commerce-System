// =============================================================
// features/reviews/components/reviewed-card.tsx
// Thẻ hiển thị đánh giá đã viết (status: 'published')
// Hiển thị sao, bình luận, ảnh đính kèm, nhãn Đã mua hàng, nút sửa/xóa
// =============================================================

"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Edit2, Star, Trash2 } from "lucide-react";
import React, { useState } from "react";
import type { UserReview } from "../types";

interface ReviewedCardProps {
  review: UserReview;
  onEdit: (review: UserReview) => void;
  onDelete: (reviewId: string) => void;
}

export function ReviewedCard({ review, onEdit, onDelete }: ReviewedCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const detailUrl = `/listProduct/detailProduct?id=${encodeURIComponent(review.productId)}`;

  const reviewDateStr = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const handleDeleteClick = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đánh giá này không?")) {
      setIsDeleting(true);
      onDelete(review._id);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* 1. Thông tin sản phẩm & Nút sửa/xóa */}
      <div className="flex items-start justify-between gap-4 border-b border-line/60 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Ảnh đại diện sản phẩm */}
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-canvas">
            {review.productImage && !imageError ? (
              <Image
                src={review.productImage}
                alt={review.productName}
                fill
                sizes="56px"
                className="object-contain p-1"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl">
                📦
              </div>
            )}
          </div>

          <div className="min-w-0">
            <Link
              href={detailUrl}
              className="line-clamp-1 text-sm font-bold text-ink hover:text-brand transition-colors"
            >
              {review.productName}
            </Link>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="size-3" />
                Đã mua hàng
              </span>
              <span>·</span>
              <span>{reviewDateStr}</span>
            </div>
          </div>
        </div>

        {/* Nút Sửa & Xóa */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(review)}
            aria-label="Chỉnh sửa đánh giá"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-brand hover:bg-brand-subtle transition-colors cursor-pointer"
          >
            <Edit2 className="size-3.5" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteClick}
            aria-label="Xóa đánh giá"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-danger hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            <span>Xóa</span>
          </button>
        </div>
      </div>

      {/* 2. Điểm số sao đánh giá */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`size-4 ${
                star <= review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-200 fill-slate-100"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-ink">
          {review.rating === 5
            ? "Cực kỳ hài lòng"
            : review.rating === 4
            ? "Hài lòng"
            : review.rating === 3
            ? "Bình thường"
            : review.rating === 2
            ? "Không hài lòng"
            : "Rất tệ"}
        </span>
      </div>

      {/* 3. Nội dung bình luận */}
      {review.comment ? (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {review.comment}
        </p>
      ) : (
        <p className="text-xs italic text-muted">
          (Khách hàng không để lại nhận xét bằng lời)
        </p>
      )}

      {/* 4. Danh sách hình ảnh đính kèm (nếu có) */}
      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {review.images.map((imgUrl, idx) => (
            <div
              key={idx}
              className="relative h-16 w-16 overflow-hidden rounded-xl border border-line bg-canvas"
            >
              <Image
                src={imgUrl}
                alt={`Ảnh đánh giá ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

