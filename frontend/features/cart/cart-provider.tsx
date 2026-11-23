"use client";

// =============================================================
// features/cart/cart-provider.tsx
// Context quản lý giỏ hàng toàn ứng dụng, đồng bộ dữ liệu với MongoDB bằng useEffect
// =============================================================

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { addToCartApi, getCartApi } from "./services/cart.service";
import { useAuth } from "@/features/auth/auth-provider";

type CartContextValue = {
  quantity: number;
  total: number;
  refreshCart: () => Promise<void>;
  addItem?: (product: { id: string; variants?: Array<{ sku: string }> }) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [quantity, setQuantity] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const { user, status } = useAuth();

  // Gọi API lấy số lượng và tổng tiền từ DB (hoặc localStorage cho guest)
  const syncCartFromDb = useCallback(async () => {
    try {
      const res = await getCartApi();
      const cartSummary = res.data?.cart?.summary;
      if (cartSummary) {
        setQuantity(cartSummary.totalQuantity ?? 0);
        setTotal(cartSummary.total ?? 0);
      } else {
        setQuantity(0);
        setTotal(0);
      }
    } catch {
      // Khi chưa có cart trong DB thì giữ 0
      setQuantity(0);
      setTotal(0);
    }
  }, []);

  // Tự động đồng bộ giỏ hàng khi trạng thái đăng nhập thay đổi (login / logout / switch account)
  useEffect(() => {
    if (status !== "loading") {
      void syncCartFromDb();
    }
  }, [user?.id, status, syncCartFromDb]);

  // Lắng nghe event cart-updated khi có thay đổi giỏ hàng từ bất kỳ đâu trong app
  useEffect(() => {
    const handleCartUpdated = () => {
      void syncCartFromDb();
    };

    window.addEventListener("cart-updated", handleCartUpdated);
    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
    };
  }, [syncCartFromDb]);

  const addItem = async (product: { id: string; variants?: Array<{ sku: string }> }) => {
    try {
      const sku = product.variants?.[0]?.sku || "default";
      await addToCartApi({
        productId: product.id,
        variantSku: sku,
        quantity: 1,
      });
      await syncCartFromDb();
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      console.error("Lỗi khi thêm vào giỏ hàng:", err);
    }
  };

  return (
    <CartContext.Provider value={{ quantity, total, refreshCart: syncCartFromDb, addItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return cart;
}
