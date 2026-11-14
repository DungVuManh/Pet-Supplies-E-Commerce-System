// =============================================================
// features/wishlist/types.ts
// Định nghĩa kiểu dữ liệu cho Danh sách yêu thích (Wishlist)
// =============================================================

export interface WishlistProduct {
  _id: string;
  id: string;
  name: string;
  brand: string;
  description?: string;
  image: string;
  images?: string[];
  price: number;
  ratingAvg?: number;
  ratingCount?: number;
  soldCount?: number;
  inStock?: boolean;
  sku?: string;
  addedAt?: string;
}

export type WishlistSortOption = "latest" | "price-asc" | "price-desc";

export interface WishlistResponse {
  success: boolean;
  data: {
    items: WishlistProduct[];
    total: number;
    isGuest?: boolean;
  };
  message?: string;
}

export interface ToggleWishlistResponse {
  success: boolean;
  data: {
    productId: string;
    inWishlist: boolean;
    total: number;
    message: string;
  };
}

export interface ToastInfo {
  id: number;
  type: "success" | "info" | "error";
  message: string;
  action?: {
    label: string;
    href: string;
  };
}
