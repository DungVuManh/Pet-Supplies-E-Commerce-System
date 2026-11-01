// =============================================================
// features/wishlist/components/wishlist-view.tsx
// Component chính của màn hình Danh sách yêu thích (Wishlist)
// =============================================================

"use client";

import React from "react";
import { useWishlist } from "../hooks/use-wishlist";
import { WishlistEmpty } from "./wishlist-empty";
import { WishlistGrid } from "./wishlist-grid";
import { WishlistHeader } from "./wishlist-header";
import { WishlistToast } from "./wishlist-toast";
import { WishlistToolbar } from "./wishlist-toolbar";

export function WishlistView() {
  const {
    items,
    filteredItems,
    totalCount,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    toasts,
    removeToast,
    removeItem,
    clearAll,
  } = useWishlist();

  return (
    <section className="w-full">
      {/* 1. Header: Breadcrumb & Tiêu đề */}
      <WishlistHeader totalCount={totalCount} />

      {/* 2. Trường hợp đang tải dữ liệu */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="aspect-square w-full rounded-xl bg-slate-200" />
              <div className="mt-3 h-3 w-1/3 rounded-sm bg-slate-200" />
              <div className="mt-2 h-4 w-3/4 rounded-sm bg-slate-200" />
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="h-5 w-20 rounded-sm bg-slate-200" />
                <div className="h-8 w-24 rounded-xl bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : totalCount === 0 ? (
        /* 3. Trường hợp danh sách yêu thích hoàn toàn trống */
        <WishlistEmpty />
      ) : (
        /* 4. Có sản phẩm trong danh sách yêu thích */
        <div>
          {/* Thanh công cụ: Tìm kiếm, sắp xếp & xóa tất cả */}
          <WishlistToolbar
            totalCount={totalCount}
            searchQuery={searchQuery}
            sortBy={sortBy}
            onSearchChange={setSearchQuery}
            onSortChange={setSortBy}
            onClearAll={clearAll}
          />

          {/* Lưới sản phẩm hoặc rỗng khi tìm kiếm không ra */}
          {filteredItems.length === 0 ? (
            <WishlistEmpty
              isSearchEmpty
              onResetSearch={() => setSearchQuery("")}
            />
          ) : (
            <WishlistGrid
              products={filteredItems}
              onRemove={removeItem}
            />
          )}
        </div>
      )}

      {/* 5. Toast thông báo góc màn hình */}
      <WishlistToast toasts={toasts} onDismiss={removeToast} />
    </section>
  );
}

