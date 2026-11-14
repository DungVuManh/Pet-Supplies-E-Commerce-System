// =============================================================
// features/reviews/components/review-modal.tsx
// Modal tạo đánh giá mới hoặc chỉnh sửa đánh giá hiện có
// Tích hợp upload 1-2 ảnh lên Cloudinary & Màn hình cảm ơn sau khi đánh giá
// =============================================================

"use client";

import Image from "next/image";
import { Camera, CheckCircle2, Heart, Star, Trash2, UploadCloud, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { uploadReviewImagesApi } from "../services/review.service";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [rating, setRating] = useState<number>(editingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(editingReview?.comment || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ảnh đính kèm (tối đa 2 ảnh)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Màn hình Cảm ơn khách hàng sau khi đánh giá
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    if (editingReview) {
      setRating(editingReview.rating);
      setComment(editingReview.comment || "");
      setExistingImages(editingReview.images || []);
    } else {
      setRating(5);
      setComment("");
      setExistingImages([]);
    }
    setSelectedFiles([]);
    setFilePreviews([]);
    setErrorMsg(null);
    setShowThankYou(false);
  }, [editingReview, unreviewedItem]);

  // Giải phóng URL preview khi unmount hoặc đổi ảnh
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  // Đóng modal bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting && !isUploadingImages) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting, isUploadingImages]);

  if (!unreviewedItem && !editingReview) return null;

  const productName = editingReview?.productName || unreviewedItem?.productName || "Sản phẩm";
  const productImage = editingReview?.productImage || unreviewedItem?.productImage || "";

  // Xử lý chọn ảnh từ máy (tối đa 2 ảnh)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalAllowed = 2 - existingImages.length;
    if (totalAllowed <= 0) {
      setErrorMsg("Mỗi đánh giá chỉ được đăng tối đa 2 ảnh.");
      return;
    }

    const validFiles = files.slice(0, totalAllowed);
    if (files.length > totalAllowed) {
      setErrorMsg(`Chỉ được chọn thêm tối đa ${totalAllowed} ảnh (tổng cộng 2 ảnh).`);
    } else {
      setErrorMsg(null);
    }

    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, totalAllowed));
    setFilePreviews((prev) => [...prev, ...newPreviews].slice(0, totalAllowed));
  };

  // Xóa ảnh mới chọn
  const handleRemoveNewImage = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Xóa ảnh cũ đã lưu trước đó (khi sửa)
  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (rating < 1 || rating > 5) {
      setErrorMsg("Vui lòng chọn số sao từ 1 đến 5.");
      return;
    }

    try {
      let uploadedUrls: string[] = [];
      // 1. Nếu có file mới, upload lên Cloudinary qua backend
      if (selectedFiles.length > 0) {
        setIsUploadingImages(true);
        uploadedUrls = await uploadReviewImagesApi(selectedFiles);
        setIsUploadingImages(false);
      }

      // Tổng hợp ảnh (ảnh cũ còn giữ + ảnh mới vừa upload lên Cloudinary)
      const finalImages = [...existingImages, ...uploadedUrls].slice(0, 2);

      // 2. Gửi API lưu đánh giá
      if (isEditing && editingReview) {
        await onSubmitUpdate(editingReview._id, {
          rating,
          comment: comment.trim(),
          images: finalImages,
        });
        // Hiển thị cảm ơn
        setShowThankYou(true);
      } else if (unreviewedItem) {
        await onSubmitCreate({
          productId: unreviewedItem.productId,
          orderId: unreviewedItem.orderId,
          rating,
          comment: comment.trim(),
          images: finalImages,
        });
        // Hiển thị cảm ơn
        setShowThankYou(true);
      }
    } catch (err) {
      setIsUploadingImages(false);
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    }
  };

  const currentDisplayRating = hoverRating || rating;
  const isBusy = isSubmitting || isUploadingImages;
  const totalImagesCount = existingImages.length + selectedFiles.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto [scrollbar-width:none]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          aria-label="Đóng cửa sổ"
          className="absolute right-5 top-5 rounded-full p-1.5 text-muted hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {/* ------------------------------------------------------------- */}
        {/* TRẠNG THÁI 1: CẢM ƠN KHÁCH HÀNG SAU KHI ĐÁNH GIÁ THÀNH CÔNG   */}
        {/* ------------------------------------------------------------- */}
        {showThankYou ? (
          <div className="py-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-500 mb-4 border border-amber-200 shadow-xs">
              <Heart className="size-10 fill-amber-400 text-amber-400" />
            </div>

            <h2 className="text-xl font-bold text-ink sm:text-2xl">
              Cảm ơn bạn đã đánh giá!
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed max-w-md mx-auto">
              Đánh giá của bạn đã được ghi nhận thành công. Ý kiến đóng góp từ bạn là nguồn động lực lớn giúp Petjoy và cộng đồng chăm sóc thú cưng ngày một tốt hơn!
            </p>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white shadow-xs hover:bg-brand/90 transition-colors cursor-pointer"
              >
                Xem đánh giá của tôi
              </button>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* TRẠNG THÁI 2: FORM NHẬP ĐÁNH GIÁ & TẢI ẢNH CLOUDINARY          */
          /* ------------------------------------------------------------- */
          <>
            {/* Tiêu đề Modal */}
            <h2 id="review-modal-title" className="text-lg font-bold text-ink">
              {isEditing ? "Chỉnh sửa đánh giá" : "Đánh giá sản phẩm"}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Chia sẻ trải nghiệm thực tế và tải ảnh kèm theo (tối đa 2 ảnh).
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
                  Nhận xét chi tiết hoặc khiếu nại (không bắt buộc)
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận về chất lượng sản phẩm, bao bì đóng gói hoặc phản ứng của bé cưng khi dùng..."
                  maxLength={1000}
                  className="w-full rounded-2xl border border-line bg-canvas p-3.5 text-xs text-ink placeholder:text-muted focus:border-brand focus:bg-surface focus:outline-none transition-colors"
                />
                <div className="mt-1 text-right text-[11px] text-muted">
                  {comment.length}/1000 ký tự
                </div>
              </div>

              {/* Khu vực tải ảnh lên Cloudinary (Tối đa 2 ảnh) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Camera className="size-3.5 text-brand" />
                    <span>Hình ảnh thực tế / Khiếu nại</span>
                  </label>
                  <span className="text-[11px] text-muted">
                    {totalImagesCount}/2 ảnh
                  </span>
                </div>

                {/* Danh sách ảnh đã chọn & Nút thêm ảnh */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* 1. Các ảnh cũ đã có từ trước (nếu đang sửa) */}
                  {existingImages.map((url, idx) => (
                    <div
                      key={`existing-${idx}`}
                      className="relative h-16 w-16 overflow-hidden rounded-xl border border-line bg-canvas group"
                    >
                      <Image
                        src={url}
                        alt="Ảnh cũ"
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(idx)}
                        disabled={isBusy}
                        aria-label="Xóa ảnh này"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}

                  {/* 2. Các ảnh mới vừa chọn từ máy */}
                  {filePreviews.map((previewUrl, idx) => (
                    <div
                      key={`new-${idx}`}
                      className="relative h-16 w-16 overflow-hidden rounded-xl border border-line bg-canvas group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Ảnh mới chọn"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(idx)}
                        disabled={isBusy}
                        aria-label="Xóa ảnh này"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}

                  {/* 3. Nút bấm chọn ảnh (chỉ hiện khi chưa đủ 2 ảnh) */}
                  {totalImagesCount < 2 && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-canvas hover:border-brand hover:bg-brand-subtle/30 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <UploadCloud className="size-4 text-brand" />
                      <span className="text-[10px] font-semibold text-muted">Thêm ảnh</span>
                    </button>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Tải lên tối đa 2 ảnh (định dạng JPG, PNG, WEBP, tối đa 5MB/ảnh).
                </p>
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
                  disabled={isBusy}
                  onClick={onClose}
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-canvas transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingImages
                    ? "Đang tải ảnh lên..."
                    : isSubmitting
                    ? "Đang lưu đánh giá..."
                    : isEditing
                    ? "Lưu thay đổi"
                    : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
