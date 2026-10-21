"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product } from "@/features/catalog/products";
import { addCartItem, cartQuantity, cartTotal, type CartItem } from "./cart";

type CartContextValue = {
  items: readonly CartItem[];
  quantity: number;
  total: number;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [announcement, setAnnouncement] = useState("");

  function addItem(product: Product) {
    setItems((current) => addCartItem(current, product));
    setAnnouncement(`Đã thêm ${product.name} vào giỏ hàng.`);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.product.id !== id));
    setAnnouncement("Đã xóa sản phẩm khỏi giỏ hàng.");
  }

  return (
    <CartContext.Provider value={{ items, quantity: cartQuantity(items), total: cartTotal(items), addItem, removeItem }}>
      {children}
      <p role="status" aria-atomic="true" className="sr-only">{announcement}</p>
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return cart;
}
