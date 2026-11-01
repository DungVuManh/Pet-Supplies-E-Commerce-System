// =============================================================
// features/reviews/components/my-reviews-view.tsx
// Màn hình chính "Đánh giá của tôi" theo userId
// Giao diện đồng bộ với Đơn hàng & Wishlist, chia cột cùng AccountSidebar
// =============================================================

"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight, RefreshCw } from "lucide-react";
import React from "react";
import { AccountSidebar } from "@/features/orders/components/account-sidebar";
import { useMyReviews } from "../hooks/use-my-reviews";
import { ReviewEmpty } from "./review-empty";
import { ReviewModal } from "./review-modal";
import { ReviewTabs } from "./review-tabs";
import { ReviewedCard } from "./reviewed-card";
import { UnreviewedCard } from "./unreviewed-card";

export function MyReviewsView() {
  const {
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
    reload,
    handleCreateReview,
    handleUpdateReview,
    handleDeleteReview,
  } = useMyReviews();

  const unreviewedList = data?.unreviewed || [];
  const reviewedList = data?.reviewed || [];
  const unreviewedCount = data?.counts?.unreviewed ?? unreviewedList.length;
  const reviewedCount = data?.counts?.reviewed ?? reviewedList.length;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold text-white shadow-lg animate-in slide-in-from-bottom duration-200 ${
            toastMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Breadcrumb điều hướng */}
      <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-brand transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="size-3.5 text-slate-400" />
        <Link href="/orders" className="hover:text-brand transition-colors">
          Tài khoản
        </Link>
        <ChevronRight className="size-3.5 text-slate-400" />
        <span className="font-semibold text-ink">Đánh giá của tôi</span>
      </nav>

      {/* Bố cục 2 cột (Cột trái: AccountSidebar, Cột phải: Nội dung chính) */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        <AccountSidebar />

        <div className="flex-1 min-w-0">
          {/* Header tiêu đề */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Đánh giá của tôi
            </h1>
            <p className="mt-1 text-xs text-muted">
              Quản lý các nhận xét sản phẩm bạn đã mua và gửi đánh giá cho các đơn hoàn tất trong 30 ngày qua.
            </p>
          </div>

          {/* Thanh Tabs chuyển đổi */}
          <div className="mb-6">
            <ReviewTabs
              activeTab={activeTab}
              unreviewedCount={unreviewedCount}
              reviewedCount={reviewedCount}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Trạng thái Đang tải */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-12 text-center text-muted">
              <RefreshCw className="size-6 animate-spin text-brand mb-2" />
              <span className="text-xs">Đang tải danh sách đánh giá...</span>
            </div>
          )}

          {/* Trạng thái Báo lỗi */}
          {error && !isLoading && (
            <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={reload}
                className="font-bold underline hover:no-underline ml-4 shrink-0"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Nội dung danh sách theo tab */}
          {!isLoading && !error && (
            <>
              {/* TAB 1: CHƯA ĐÁNH GIÁ */}
              {activeTab === "unreviewed" && (
                <div>
                  {unreviewedList.length === 0 ? (
                    <ReviewEmpty tab="unreviewed" />
                  ) : (
                    <div className="space-y-3.5">
                      {unreviewedList.map((item) => (
                        <UnreviewedCard
                          key={`${item.orderId}-${item.productId}-${item.variantSku}`}
                          item={item}
                          onReviewClick={(selected) => setReviewingItem(selected)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ĐÃ ĐÁNH GIÁ */}
              {activeTab === "reviewed" && (
                <div>
                  {reviewedList.length === 0 ? (
                    <ReviewEmpty tab="reviewed" />
                  ) : (
                    <div className="space-y-4">
                      {reviewedList.map((review) => (
                        <ReviewedCard
                          key={review._id}
                          review={review}
                          onEdit={(rev) => setEditingReview(rev)}
                          onDelete={handleDeleteReview}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Viết / Sửa đánh giá */}
      <ReviewModal
        unreviewedItem={reviewingItem}
        editingReview={editingReview}
        isSubmitting={isSubmitting}
        onClose={() => {
          setReviewingItem(null);
          setEditingReview(null);
        }}
        onSubmitCreate={handleCreateReview}
        onSubmitUpdate={handleUpdateReview}
      />
    </div>
  );
}

