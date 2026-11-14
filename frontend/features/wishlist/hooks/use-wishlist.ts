// =============================================================
// features/wishlist/hooks/use-wishlist.ts
// Hook quản lý toàn bộ dữ liệu & logic của Danh sách yêu thích
// =============================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import type { ToastInfo, WishlistProduct, WishlistSortOption } from "../types";
import {
  clearWishlistApi,
  getWishlistApi,
  removeWishlistItemApi,
  toggleWishlistApi,
} from "../services/wishlist.service";

export function useWishlistInternal() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<WishlistSortOption>("latest");
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // 1. Hàm hiển thị Toast thông báo ngắn
  const showToast = useCallback(
    (
      message: string,
      type: "success" | "info" | "error" = "success",
      action?: { label: string; href: string }
    ) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type, action }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 2. Tải danh sách yêu thích từ server
  const loadWishlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getWishlistApi();
      if (res?.data?.items && Array.isArray(res.data.items)) {
        setItems(res.data.items);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Lắng nghe sự kiện đồng bộ khi có thay đổi từ các trang khác hoặc thay đổi user
  useEffect(() => {
    loadWishlist();

    const handleWishlistUpdated = () => {
      loadWishlist();
    };

    window.addEventListener("wishlist-updated", handleWishlistUpdated);
    return () => {
      window.removeEventListener("wishlist-updated", handleWishlistUpdated);
    };
  }, [loadWishlist]);

  // 3. Kiểm tra sản phẩm có trong danh sách yêu thích không
  const isSaved = useCallback(
    (productId: string): boolean => {
      if (!productId || !user) return false;
      const target = String(productId);
      return items.some((item) => String(item.id || item._id) === target);
    },
    [items, user]
  );

  // 4. Thao tác Lưu / Bỏ lưu (Toggle)
  const toggleSave = useCallback(
    async (product: Partial<WishlistProduct> & { id?: string; _id?: string }) => {
      const prodId = String(product.id || product._id || "");
      if (!prodId) return;

      // KIỂM TRA ĐĂNG NHẬP: Nếu chưa đăng nhập -> Thông báo yêu cầu đăng nhập
      if (!user) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;

        showToast(
          "Vui lòng đăng nhập để lưu sản phẩm vào danh sách yêu thích!",
          "info",
          {
            label: "Đăng nhập ngay",
            href: loginUrl,
          }
        );
        return;
      }

      const currentlySaved = items.some(
        (item) => String(item.id || item._id) === prodId
      );

      // Cập nhật Optimistic trên state trước để UI phản hồi tức thì
      let nextItems: WishlistProduct[];
      if (currentlySaved) {
        nextItems = items.filter(
          (item) => String(item.id || item._id) !== prodId
        );
      } else {
        const newItem: WishlistProduct = {
          _id: prodId,
          id: prodId,
          name: product.name || "Sản phẩm",
          brand: product.brand || "Petjoy",
          description: product.description || "",
          image:
            product.image ||
            product.images?.[0] ||
            "/images/products/royal-canin-mini-adult.png",
          images: product.images || [],
          price: product.price || 0,
          ratingAvg: product.ratingAvg ?? 5.0,
          ratingCount: product.ratingCount ?? 0,
          soldCount: product.soldCount ?? 0,
          inStock: product.inStock ?? true,
          sku: product.sku || "",
          addedAt: new Date().toISOString(),
        };
        nextItems = [newItem, ...items];
      }

      setItems(nextItems);

      // Gửi API lên backend MongoDB
      try {
        const res = await toggleWishlistApi(prodId);
        showToast(
          res.data.inWishlist
            ? "Đã thêm vào danh sách yêu thích!"
            : "Đã bỏ lưu sản phẩm khỏi danh sách yêu thích.",
          "success"
        );
      } catch (err: any) {
        loadWishlist();
        showToast(
          err?.message || "Không thể cập nhật danh sách yêu thích",
          "error"
        );
      } finally {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("wishlist-updated"));
        }
      }
    },
    [items, user, showToast, loadWishlist]
  );

  // 5. Xóa 1 sản phẩm khỏi danh sách
  const removeItem = useCallback(
    async (productId: string) => {
      const prodId = String(productId);
      const nextItems = items.filter(
        (item) => String(item.id || item._id) !== prodId
      );
      setItems(nextItems);

      try {
        await removeWishlistItemApi(prodId);
        showToast("Đã xóa sản phẩm khỏi danh sách yêu thích.", "success");
      } catch {
        showToast("Không thể xóa sản phẩm.", "error");
        loadWishlist();
      } finally {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("wishlist-updated"));
        }
      }
    },
    [items, showToast, loadWishlist]
  );

  // 6. Xóa toàn bộ danh sách yêu thích
  const clearAll = useCallback(async () => {
    if (items.length === 0) return;

    setItems([]);

    try {
      await clearWishlistApi();
      showToast("Đã xóa tất cả sản phẩm khỏi danh sách yêu thích.", "success");
    } catch {
      showToast("Không thể xóa toàn bộ danh sách yêu thích.", "error");
      loadWishlist();
    } finally {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("wishlist-updated"));
      }
    }
  }, [items.length, showToast, loadWishlist]);

  // 7. Lọc theo từ khóa tìm kiếm và sắp xếp
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q))
      );
    }

    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [items, searchQuery, sortBy]);

  return {
    items,
    filteredItems,
    totalCount: items.length,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    toasts,
    showToast,
    removeToast,
    isSaved,
    toggleSave,
    removeItem,
    clearAll,
    refreshWishlist: loadWishlist,
  };
}

export const useWishlist = useWishlistInternal;
