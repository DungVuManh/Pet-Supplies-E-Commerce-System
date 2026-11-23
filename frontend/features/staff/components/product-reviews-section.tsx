"use client";

// =============================================================
// features/staff/components/product-reviews-section.tsx
// Khối hiển thị đánh giá từ khách hàng cho sản phẩm trong Staff Workspace
// Hỗ trợ: Thống kê số sao, bộ lọc theo sao/ảnh, sắp xếp, modal xem ảnh & phân trang
// =============================================================

import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Image as ImageIcon,
  MessageSquare,
  Package,
  Star,
  User,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { card } from "./staff-ui";
import {
  fetchStaffProductReviews,
  type StaffProductReview,
  type StaffProductReviewsData,
  type StaffProductReviewsQuery,
} from "../products/api";

type ProductReviewsSectionProps = {
  sku: string;
  productName?: string;
};

function formatReviewDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function ProductReviewsSection({ sku, productName }: ProductReviewsSectionProps) {
  const [data, setData] = useState<StaffProductReviewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc & Sắp xếp
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [hasImagesFilter, setHasImagesFilter] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<"recent" | "rating_desc" | "rating_asc">("recent");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal xem ảnh phóng to
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const query: StaffProductReviewsQuery = {
        rating: ratingFilter,
        hasImages: hasImagesFilter ? true : undefined,
        sort: sortOrder,
        page: currentPage,
        limit: 8,
      };

      const result = await fetchStaffProductReviews(sku, query);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách đánh giá.");
    } finally {
      setIsLoading(false);
    }
  }, [sku, ratingFilter, hasImagesFilter, sortOrder, currentPage]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Đóng modal ảnh bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const summary = data?.summary;
  const reviews = data?.reviews || [];
  const pagination = data?.pagination;

  const handleRatingChange = (val: string) => {
    setRatingFilter(val);
    setCurrentPage(1);
  };

  const handleHasImagesChange = () => {
    setHasImagesFilter((prev) => !prev);
    setCurrentPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as "recent" | "rating_desc" | "rating_asc");
    setCurrentPage(1);
  };

  return (
    <section className={`${card} p-6 space-y-6 mt-6`} aria-labelledby="customer-reviews-heading">
      {/* Header tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 id="customer-reviews-heading" className="text-xl font-semibold text-ink flex items-center gap-2">
            <MessageSquare className="size-5 text-brand" />
            <span>Đánh giá từ khách hàng</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Theo dõi phản hồi thực tế và trải nghiệm của người mua đối với sản phẩm này.
          </p>
        </div>

        {summary && summary.totalReviews > 0 && (
          <div className="flex items-center gap-3 bg-canvas px-3.5 py-1.5 rounded-xl border border-line">
            <div className="flex items-center gap-1 text-amber-500 font-bold text-base">
              <Star className="size-5 fill-amber-400 text-amber-400" />
              <span>{summary.averageRating.toFixed(1)}</span>
            </div>
            <span className="text-xs text-muted">/ 5.0 ({summary.totalReviews} đánh giá)</span>
          </div>
        )}
      </div>

      {/* Lỗi nếu có */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Khối Thống kê Tổng quan (Summary Breakdown) */}
      {summary && summary.totalReviews > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-canvas/60 rounded-2xl p-5 border border-line">
          {/* Cột trái: Điểm số trung bình */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-line pb-4 md:pb-0 md:pr-4">
            <span className="text-4xl font-extrabold text-ink tracking-tight">
              {summary.averageRating.toFixed(1)}
            </span>
            <div className="flex items-center gap-1 mt-2 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`size-4 ${
                    s <= Math.round(summary.averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted mt-1.5 font-medium">
              Dựa trên {summary.totalReviews} đánh giá
            </span>
          </div>

          {/* Cột phải: Thanh tỉ lệ từng mức sao 5 -> 1 */}
          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const item = summary.breakdown[star as 1 | 2 | 3 | 4 | 5] || { count: 0, percentage: 0 };
              const isSelected = ratingFilter === String(star);

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingChange(isSelected ? "all" : String(star))}
                  className={`w-full flex items-center gap-3 text-xs p-1 rounded-lg transition-colors cursor-pointer text-left ${
                    isSelected ? "bg-brand-subtle/80 font-bold" : "hover:bg-surface/80"
                  }`}
                >
                  <span className="w-12 text-muted font-medium flex items-center gap-1 shrink-0">
                    <span>{star}</span>
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                  </span>

                  <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>

                  <span className="w-10 text-right text-muted shrink-0 text-[11px]">
                    {item.percentage}%
                  </span>
                  <span className="w-12 text-right text-ink font-semibold shrink-0">
                    ({item.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Thanh Công cụ Bộ lọc & Sắp xếp */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Bộ lọc số sao */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted flex items-center gap-1 mr-1">
            <Filter className="size-3.5" />
            Lọc:
          </span>

          <button
            type="button"
            onClick={() => handleRatingChange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              ratingFilter === "all"
                ? "bg-brand text-white border-brand shadow-xs"
                : "border-line bg-surface text-ink hover:bg-canvas"
            }`}
          >
            Tất cả
          </button>

          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleRatingChange(String(s))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                ratingFilter === String(s)
                  ? "bg-brand text-white border-brand shadow-xs"
                  : "border-line bg-surface text-ink hover:bg-canvas"
              }`}
            >
              <span>{s}</span>
              <Star className="size-3 fill-current text-amber-400" />
            </button>
          ))}

          {/* Nút lọc Có hình ảnh */}
          <button
            type="button"
            onClick={handleHasImagesChange}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              hasImagesFilter
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "border-line bg-surface text-ink hover:bg-canvas"
            }`}
          >
            <ImageIcon className="size-3.5" />
            <span>Có hình ảnh</span>
          </button>
        </div>

        {/* Dropdown Sắp xếp */}
        <div className="flex items-center gap-2">
          <label htmlFor="staff-review-sort" className="text-xs text-muted font-medium whitespace-nowrap">
            Sắp xếp:
          </label>
          <select
            id="staff-review-sort"
            value={sortOrder}
            onChange={handleSortChange}
            className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-hidden"
          >
            <option value="recent">Mới nhất</option>
            <option value="rating_desc">Đánh giá cao nhất</option>
            <option value="rating_asc">Đánh giá thấp nhất</option>
          </select>
        </div>
      </div>

      {/* Danh sách các Đánh giá */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted">
          Đang tải đánh giá từ khách hàng...
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
          <MessageSquare className="size-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-ink">Chưa có đánh giá nào phù hợp với bộ lọc.</p>
          <p className="text-xs text-muted mt-1">
            {ratingFilter !== "all" || hasImagesFilter
              ? "Hãy thử bỏ bớt bộ lọc sao hoặc bộ lọc hình ảnh để xem toàn bộ đánh giá."
              : "Sản phẩm này chưa nhận được nhận xét nào từ khách hàng."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {reviews.map((rev) => (
            <article key={rev.id} className="py-5 first:pt-2 last:pb-2 space-y-3">
              {/* Hàng 1: Khách hàng, Số sao & Thời gian */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {/* Avatar Initials */}
                  <div className="size-9 rounded-full bg-brand-subtle text-brand flex items-center justify-center font-bold text-xs uppercase border border-brand/20 shrink-0">
                    {rev.author.fullName.charAt(0) || "K"}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-ink">{rev.author.fullName}</span>
                      {rev.order?.orderCode && (
                        <Link
                          href={`/staff/orders/${encodeURIComponent(rev.order.id)}`}
                          className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 text-[11px] font-semibold text-blue-600 border border-line hover:bg-blue-50 transition-colors"
                          title="Xem chi tiết đơn hàng này"
                        >
                          <Package className="size-3" />
                          <span>Đơn #{rev.order.orderCode}</span>
                        </Link>
                      )}
                    </div>
                    <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                      {rev.author.email && <span>{rev.author.email}</span>}
                      {rev.author.phone && <span>· {rev.author.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Số sao & Mốc thời gian */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`size-3.5 ${
                          s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatReviewDate(rev.createdAt)}
                  </span>
                </div>
              </div>

              {/* Hàng 2: Nội dung nhận xét */}
              {rev.comment ? (
                <p className="text-sm text-ink leading-relaxed whitespace-pre-line pl-12">
                  {rev.comment}
                </p>
              ) : (
                <p className="text-xs text-muted italic pl-12">
                  Khách hàng không để lại nhận xét văn bản.
                </p>
              )}

              {/* Hàng 3: Ảnh thực tế đính kèm */}
              {rev.images && rev.images.length > 0 && (
                <div className="pl-12 flex items-center gap-3 pt-1">
                  {rev.images.map((imgUrl, imgIdx) => (
                    <button
                      key={imgIdx}
                      type="button"
                      onClick={() => setPreviewImage(imgUrl)}
                      className="relative size-16 rounded-xl border border-line bg-canvas overflow-hidden hover:opacity-90 hover:ring-2 hover:ring-brand transition-all cursor-pointer group"
                      title="Bấm để phóng to ảnh"
                    >
                      <Image
                        src={imgUrl}
                        alt={`Ảnh đánh giá ${imgIdx + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Phân trang */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
          <span>
            Hiển thị {reviews.length} trong tổng số {pagination.totalReviews} đánh giá
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-line bg-surface text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-canvas transition-colors cursor-pointer"
              aria-label="Trang trước"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="px-2.5 py-1 rounded-lg border border-line bg-canvas font-semibold text-ink">
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-line bg-surface text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-canvas transition-colors cursor-pointer"
              aria-label="Trang sau"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal xem ảnh phóng to */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-2xl w-full max-h-[85vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 transition-colors p-1 cursor-pointer"
              aria-label="Đóng xem ảnh"
            >
              <X className="size-7" />
            </button>

            <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden bg-black/40 border border-white/20 shadow-2xl">
              <Image
                src={previewImage}
                alt="Ảnh phóng to"
                fill
                sizes="(max-width: 768px) 100vw, 700px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

