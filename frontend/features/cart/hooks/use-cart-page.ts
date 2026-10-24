import { useMemo, useState } from "react";
import { INITIAL_MOCK_CART_ITEMS } from "../mock-data";
import type { CartItem, CartSummary } from "../types";

export function useCartPage() {
  const [items, setItems] = useState<CartItem[]>(INITIAL_MOCK_CART_ITEMS);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string>("Chưa áp dụng mã giảm giá.");
  const [promoError, setPromoError] = useState<boolean>(false);

  // Tăng số lượng
  function increaseQuantity(itemId: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  // Giảm số lượng (tối thiểu = 1)
  function decreaseQuantity(itemId: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  }

  // Xóa sản phẩm
  function removeItem(itemId: string) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  // Áp dụng mã giảm giá
  function applyPromoCode() {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoMessage("Vui lòng nhập mã giảm giá.");
      setPromoError(true);
      return;
    }

    if (code === "PETLY10") {
      setAppliedPromo("PETLY10");
      setPromoMessage("Áp dụng mã PETLY10 thành công! Giảm 10%.");
      setPromoError(false);
    } else {
      setPromoMessage("Mã giảm giá không hợp lệ hoặc đã hết hạn.");
      setPromoError(true);
    }
  }

  // Tính tổng đơn hàng
  const summary: CartSummary = useMemo(() => {
    const distinctCount = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const shippingFee = items.length > 0 ? 30000 : 0;
    const discount = appliedPromo === "PETLY10" ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal + shippingFee - discount;

    return {
      distinctCount,
      totalQuantity,
      subtotal,
      shippingFee,
      discount,
      total,
    };
  }, [items, appliedPromo]);

  return {
    items,
    summary,
    promoCodeInput,
    promoMessage,
    promoError,
    appliedPromo,
    setPromoCodeInput,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    applyPromoCode,
  };
}
