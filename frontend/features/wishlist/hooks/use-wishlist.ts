// =============================================================
// features/wishlist/hooks/use-wishlist.ts
// Hook quản lý toàn bộ dữ liệu & logic của Danh sách yêu thích
// Hỗ trợ đồng bộ API với MongoDB và lưu tạm localStorage cho khách
// =============================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ToastInfo, WishlistProduct, WishlistSortOption } from "../types";
import {
  clearWishlistApi,
  getWishlistApi,
  removeWishlistItemApi,
  toggleWishlistApi,
} from "../services/wishlist.service";

const LOCAL_STORAGE_KEY = "petjoy_wishlist_items";

export function useWishlist() {
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<WishlistSortOption>("latest");
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // 1. Hàm hiển thị Toast thông báo ngắn
  const showToast = useCallback((message: string, type: "success" | "info" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 2. Tải danh sách yêu thích từ server hoặc localStorage
  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getWishlistApi();

      if (res?.data?.items && Array.isArray(res.data.items)) {
        if (!res.data.isGuest) {
          // Người dùng đã đăng nhập: Dùng dữ liệu từ MongoDB
          setItems(res.data.items);
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res.data.items));
          }
        } else {
          // Khách chưa đăng nhập: Đọc từ localStorage nếu có
          if (typeof window !== "undefined") {
            const local = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (local) {
              try {
                setItems(JSON.parse(local));
              } catch {
                setItems([]);
              }
            } else {
              setItems([]);
            }
          }
        }
      }
    } catch {
      // Khi server lỗi hoặc mất mạng: đọc từ localStorage
      if (typeof window !== "undefined") {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          try {
            setItems(JSON.parse(local));
          } catch {
            setItems([]);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Lắng nghe sự kiện đồng bộ khi có thay đổi từ các trang khác
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
      if (!productId) return false;
      const target = String(productId);
      return items.some((item) => String(item.id || item._id) === target);
    },
    [items]
  );

  // 4. Thao tác Lưu / Bỏ lưu (Toggle)
  const toggleSave = useCallback(
    async (product: Partial<WishlistProduct> & { id?: string; _id?: string }) => {
      const prodId = String(product.id || product._id || "");
      if (!prodId) return;

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
          image: product.image || product.images?.[0] || "/images/products/royal-canin-mini-adult.png",
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
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextItems));
      }

      // Gửi API lên backend MongoDB
      try {
        const res = await toggleWishlistApi(prodId);
        showToast(
          res.data.inWishlist
            ? "Đã lưu sản phẩm vào danh sách yêu thích!"
            : "Đã bỏ lưu sản phẩm khỏi danh sách yêu thích.",
          "success"
        );
      } catch (err: any) {
        // Nếu chưa đăng nhập (401), vẫn lưu ở local storage cho khách tiện theo dõi
        if (err?.message?.includes("401") || err?.message?.includes("đăng nhập")) {
          showToast(
            currentlySaved
              ? "Đã bỏ lưu sản phẩm."
              : "Đã lưu sản phẩm (Đăng nhập để đồng bộ tài khoản)!",
            "info"
          );
        } else {
          showToast(err?.message || "Không thể cập nhật danh sách yêu thích", "error");
        }
      } finally {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("wishlist-updated"));
        }
      }
    },
    [items, showToast]
  );

  // 5. Xóa 1 sản phẩm khỏi danh sách
  const removeItem = useCallback(
    async (productId: string) => {
      const prodId = String(productId);
      const nextItems = items.filter(
        (item) => String(item.id || item._id) !== prodId
      );
      setItems(nextItems);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextItems));
      }

      try {
        await removeWishlistItemApi(prodId);
        showToast("Đã xóa sản phẩm khỏi danh sách yêu thích.", "success");
      } catch {
        showToast("Đã xóa sản phẩm.", "info");
      } finally {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("wishlist-updated"));
        }
      }
    },
    [items, showToast]
  );

  // 6. Xóa toàn bộ danh sách yêu thích
  const clearAll = useCallback(async () => {
    if (items.length === 0) return;

    setItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

    try {
      await clearWishlistApi();
      showToast("Đã xóa tất cả sản phẩm khỏi danh sách yêu thích.", "success");
    } catch {
      showToast("Đã xóa toàn bộ danh sách yêu thích.", "info");
    } finally {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("wishlist-updated"));
      }
    }
  }, [items.length, showToast]);

  // 7. Lọc theo từ khóa tìm kiếm và sắp xếp
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Lọc theo search input
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q))
      );
    }

    // Sắp xếp
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
    removeToast,
    isSaved,
    toggleSave,
    removeItem,
    clearAll,
    refreshWishlist: loadWishlist,
  };
}

