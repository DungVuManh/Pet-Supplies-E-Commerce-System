"use client";

// =============================================================
// features/cart/cart-provider.tsx
// Context quản lý giỏ hàng toàn ứng dụng, đồng bộ dữ liệu với MongoDB bằng useEffect
// =============================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addToCartApi, getCartApi } from "./services/cart.service";

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

  // Gọi API lấy số lượng và tổng tiền từ DB
  const syncCartFromDb = async () => {
    try {
      const res = await getCartApi();
      const cartSummary = res.data?.cart?.summary;
      if (cartSummary) {
        setQuantity(cartSummary.totalQuantity ?? 0);
        setTotal(cartSummary.total ?? 0);
      }
    } catch {
      // Khi chưa có cart trong DB thì giữ 0
      setQuantity(0);
      setTotal(0);
    }
  };

  // useEffect lấy dữ liệu khi khởi động và lắng nghe event cart-updated
  useEffect(() => {
    const handleCartUpdated = () => {
      syncCartFromDb();
    };
    handleCartUpdated();

    window.addEventListener("cart-updated", handleCartUpdated);
    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
    };
  }, []);

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
