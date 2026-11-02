"use client";

// =============================================================
// features/wishlist/wishlist-provider.tsx
// Provider quản lý state Danh sách yêu thích tập trung cho toàn ứng dụng
// Đảm bảo đồng bộ tức thì trên tất cả ProductCard, trang Wishlist và trang Chi tiết
// =============================================================

import React, { createContext, useContext } from "react";
import { useWishlistInternal } from "./hooks/use-wishlist";
import { WishlistToast } from "./components/wishlist-toast";

type WishlistContextType = ReturnType<typeof useWishlistInternal>;

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const wishlist = useWishlistInternal();

  return (
    <WishlistContext.Provider value={wishlist}>
      {children}
      <WishlistToast toasts={wishlist.toasts} onDismiss={wishlist.removeToast} />
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
}

