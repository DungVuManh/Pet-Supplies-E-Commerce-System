"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-tabs.tsx
// Component các Tab chi tiết sản phẩm: Mô tả, Thành phần & Khối Đánh giá sản phẩm
// =============================================================

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MessageSquare, Star, ChevronDown, CheckCircle2 } from "lucide-react";
import type { Product, ReviewItem, ReviewSummary } from "../types";
import { fetchProductReviewsApi } from "../services/product-detail.service";

type TabId = "description" | "ingredients" | "reviews";

export function ProductTabs({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<TabId>("reviews"); // Mặc định mở tab đánh giá để xem ngay hoặc chuyển đổi giữa các tab

  // 1. State lưu dữ liệu đánh giá từ API thật
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);

  // 2. State bộ lọc & sắp xếp (Cột phải)
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterHasImages, setFilterHasImages] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>("featured");

  // 3. Gọi API thật lấy đánh giá theo đúng id của sản phẩm
  useEffect(() => {
    let isSubscribed = true;

    async function loadReviews() {
      try {
        setLoadingReviews(true);
        const productId = product.id || (product as any)._id || (product as any).productId;
        if (!productId) return;

        console.log("[ProductTabs] Đang tải review cho sản phẩm ID:", productId);
        const res = await fetchProductReviewsApi(productId, {
          rating: filterRating !== "all" && filterRating !== "images" ? filterRating : undefined,
          hasImages: filterRating === "images" || filterHasImages,
          sort: sortOption,
        });

        console.log("[ProductTabs] API Reviews phản hồi:", res);
        if (isSubscribed && res?.data) {
          setReviews(res.data.reviews || []);
          setSummary(res.data.summary || null);
        }
      } catch (err) {
        console.error("[ProductTabs] Lỗi khi tải đánh giá sản phẩm:", err);
      } finally {
        if (isSubscribed) setLoadingReviews(false);
      }
    }

    loadReviews();

    return () => {
      isSubscribed = false;
    };
  }, [product.id, (product as any)._id, filterRating, filterHasImages, sortOption]);

  const totalReviewsCount = summary ? summary.totalReviews : (product.ratingCount ?? 0);
  const averageRating = summary
    ? (summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : (product.ratingAvg ? product.ratingAvg.toFixed(1) : "0.0"))
    : (product.ratingAvg ? product.ratingAvg.toFixed(1) : "0.0");

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Mô tả sản phẩm" },
    { id: "ingredients", label: "Thành phần & hướng dẫn" },
    {
      id: "reviews",
      label: totalReviewsCount ? `Đánh giá (${totalReviewsCount})` : "Đánh giá",
    },
  ];

  // Helper render các ngôi sao màu vàng
  const renderStars = (rating: number, size = "size-4") => {
    return (
      <div className="flex items-center gap-0.5 text-yellow-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`${size} ${
              s <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-200 fill-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="mt-10">
      {/* Thanh chuyển các Tab */}
      <div className="flex gap-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-[#0B4DFF] text-[#0B4DFF] font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* Tab 1: Mô tả sản phẩm */}
        {activeTab === "description" && (
          <div className="prose max-w-none text-sm leading-relaxed text-slate-600">
            <p>{product.description || "Chưa có thông tin mô tả chi tiết cho sản phẩm này."}</p>
          </div>
        )}

        {/* Tab 2: Thành phần & Hướng dẫn */}
        {activeTab === "ingredients" && (
          <p className="text-sm text-slate-500">
            Thông tin thành phần dinh dưỡng và hướng dẫn sử dụng đang được cập nhật.
          </p>
        )}

        {/* Tab 3: Khối Đánh giá sản phẩm (Bố cục 2 cột mượn từ ảnh mẫu, màu xanh thương hiệu) */}
        {activeTab === "reviews" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs sm:p-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
              {/* ================= CỘT TRÁI: TỔNG QUAN ĐÁNH GIÁ (chiếm 5/12 cột) ================= */}
              <div className="flex flex-col lg:col-span-5">
                {/* 1. Tiêu đề kèm icon bong bóng chat */}
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-[#0B4DFF]" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-gray-900">Đánh giá sản phẩm</h3>
                </div>

                {/* 2. Điểm trung bình to + hàng sao + số lượng đánh giá */}
                <div className="mt-4 flex flex-col items-start">
                  <span className="text-5xl font-extrabold tracking-tight text-gray-900">
                    {averageRating}
                  </span>
                  <div className="mt-2 flex items-center gap-1.5">
                    {renderStars(Number(averageRating), "size-5")}
                  </div>
                  <span className="mt-1 text-sm text-gray-500">
                    {totalReviewsCount} đánh giá
                  </span>
                </div>

                {/* 3. Biểu đồ thanh 5 -> 1 sao */}
                <div className="mt-6 flex flex-col gap-2.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary?.breakdown?.[String(star)]?.count ?? 0;
                    const percent = summary?.breakdown?.[String(star)]?.percentage ?? 0;

                    return (
                      <div key={star} className="flex items-center gap-3 text-xs font-medium text-gray-600">
                        {/* Số sao & icon */}
                        <div className="flex items-center gap-1 w-6 shrink-0 justify-end">
                          <span>{star}</span>
                          <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                        </div>

                        {/* Thanh tiến trình (nền xanh nhạt, phần đầy màu xanh đậm) */}
                        <div className="relative h-2 flex-1 rounded-full bg-blue-100/70 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0B4DFF] transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Phần trăm bên phải */}
                        <span className="w-8 shrink-0 text-right text-gray-400">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 4. Nút xanh to "Viết đánh giá" */}
                <div className="mt-8 flex flex-col items-center sm:items-stretch">
                  <button
                    type="button"
                    onClick={() => {
                      alert("Tính năng viết đánh giá dành cho khách hàng đã hoàn thành đơn hàng có chứa sản phẩm này.");
                    }}
                    className="w-full rounded-xl bg-[#0B4DFF] px-6 py-3.5 text-center text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.99] cursor-pointer shadow-sm shadow-blue-500/20"
                  >
                    Viết đánh giá
                  </button>
                  {/* 5. Dòng chữ nhỏ giải thích điều kiện */}
                  <p className="mt-2 text-center text-xs text-gray-400">
                    Chỉ khách đã mua và nhận hàng mới đánh giá được.
                  </p>
                </div>
              </div>

              {/* ================= CỘT PHẢI: DANH SÁCH REVIEW (chiếm 7/12 cột) ================= */}
              <div className="flex flex-col lg:col-span-7 lg:border-l lg:border-gray-100 lg:pl-10">
                {/* 1. Hàng trên cùng: 2 Dropdown (Lọc theo & Sắp xếp) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-gray-100">
                  {/* Dropdown 1: Lọc theo */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Lọc theo</span>
                    <div className="relative">
                      <select
                        value={filterRating}
                        onChange={(e) => setFilterRating(e.target.value)}
                        className="appearance-none rounded-xl border border-gray-200 bg-white py-1.5 pl-3.5 pr-8 text-xs font-semibold text-gray-700 focus:border-[#0B4DFF] focus:outline-none focus:ring-1 focus:ring-[#0B4DFF] cursor-pointer"
                      >
                        <option value="all">Tất cả</option>
                        <option value="5">5 sao</option>
                        <option value="4">4 sao</option>
                        <option value="3">3 sao</option>
                        <option value="2">2 sao</option>
                        <option value="1">1 sao</option>
                        <option value="images">Có hình ảnh</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {/* Dropdown 2: Sắp xếp */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Sắp xếp</span>
                    <div className="relative">
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="appearance-none rounded-xl border border-gray-200 bg-white py-1.5 pl-3.5 pr-8 text-xs font-semibold text-gray-700 focus:border-[#0B4DFF] focus:outline-none focus:ring-1 focus:ring-[#0B4DFF] cursor-pointer"
                      >
                        <option value="featured">Nổi bật</option>
                        <option value="recent">Mới nhất</option>
                        <option value="rating_desc">Đánh giá cao nhất</option>
                        <option value="rating_asc">Đánh giá thấp nhất</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* 2. Danh sách từng review */}
                <div className="mt-5 flex flex-col divide-y divide-gray-100">
                  {loadingReviews ? (
                    <div className="py-12 text-center text-sm text-gray-400">
                      Đang tải danh sách đánh giá...
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400">
                      {filterRating !== "all" || filterHasImages
                        ? "Chưa có đánh giá nào phù hợp với bộ lọc này."
                        : "Chưa có đánh giá nào cho sản phẩm này."}
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev._id} className="flex flex-col py-5 first:pt-0 last:pb-0">
                        {/* Hàng 1: Sao vàng, Tên che, Nhãn Đã mua hàng, Ngày đăng */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {renderStars(rev.rating, "size-3.5")}
                          <span className="font-bold text-gray-800 ml-1">
                            {rev.authorName}
                          </span>
                          {rev.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 border border-emerald-200/50">
                              <CheckCircle2 className="size-2.5" />
                              Đã mua hàng
                            </span>
                          )}
                          <span className="text-gray-400 ml-auto">{rev.date}</span>
                        </div>

                        {/* Hàng 2: Nội dung nhận xét */}
                        <p className="mt-2.5 text-sm text-gray-800 leading-relaxed font-normal">
                          {rev.comment}
                        </p>

                        {/* Hàng 3: Danh sách ảnh người mua gửi kèm (nếu có) */}
                        {rev.images && rev.images.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2.5">
                            {rev.images.map((imgUrl, idx) => (
                              <div
                                key={idx}
                                className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-xs sm:size-20"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Ảnh đánh giá ${idx + 1}`}
                                  className="h-full w-full object-cover transition-transform hover:scale-105"
                                  onError={(e) => {
                                    // Fallback nếu ảnh không tải được
                                    (e.target as HTMLImageElement).src = "/images/products/royal-canin-mini-adult.png";
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductTabs;
