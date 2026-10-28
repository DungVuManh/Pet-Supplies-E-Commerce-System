// =============================================================
// features/cart/hooks/use-cart-page.ts
// Hook quản lý dữ liệu giỏ hàng, kết nối API backend bằng useEffect
// =============================================================

import { useEffect, useState } from "react";
import {
  getCartApi,
  removeCartItemApi,
  updateCartItemQuantityApi,
} from "../services/cart.service";
import type { BackendCartItem, CartItem, CartSummary } from "../types";

// Chuyển đổi dữ liệu trả về từ backend sang format dùng cho UI
function mapBackendItemToCartItem(item: BackendCartItem): CartItem {
  return {
    id: item.id || item.sku,
    product: {
      id: item.id || item.sku,
      productId: item.productId,
      name: item.name,
      description: item.description || (item.label ? `Phân loại: ${item.label}` : ""),
      sku: item.sku,
      price: item.price,
      image: item.image,
      brand: item.brand,
      label: item.label,
      stock: item.stock,
      availableStock: item.availableStock,
    },
    quantity: item.quantity,
  };
}

const DEFAULT_SUMMARY: CartSummary = {
  distinctCount: 0,
  totalQuantity: 0,
  subtotal: 0,
  shippingFee: 0,
  discount: 0,
  total: 0,
};

export function useCartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string>("Chưa áp dụng mã giảm giá.");
  const [promoError, setPromoError] = useState<boolean>(false);

  // 1. Hàm tải giỏ hàng từ API backend
  // isLoading bắt đầu là true; các lần tải lại chạy nền nên chỉ cập nhật state sau khi có phản hồi.
  const fetchCart = async () => {
    try {
      const res = await getCartApi();
      setErrorMessage(null);
      const backendCart = res.data?.cart;

      if (backendCart) {
        const mappedItems = (backendCart.items || []).map(mapBackendItemToCartItem);
        setItems(mappedItems);

        // Áp dụng giảm giá nếu có mã khuyến mãi đang dùng
        const backendSummary = backendCart.summary || DEFAULT_SUMMARY;
        const discount = appliedPromo === "PETLY10" ? Math.round(backendSummary.subtotal * 0.1) : 0;

        setSummary({
          ...backendSummary,
          discount,
          total: Math.max(0, backendSummary.subtotal + backendSummary.shippingFee - discount),
        });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Lỗi khi tải giỏ hàng");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. useEffect gọi API khi component mount và lắng nghe event giỏ hàng thay đổi
  useEffect(() => {
    const handleCartUpdated = () => {
      fetchCart();
    };
    handleCartUpdated();

    window.addEventListener("cart-updated", handleCartUpdated);
    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
    };
  }, [appliedPromo]);

  // 3. Tăng số lượng sản phẩm
  async function increaseQuantity(itemId: string) {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    try {
      const res = await updateCartItemQuantityApi(
        targetItem.product.sku,
        targetItem.quantity + 1
      );

      if (res.data?.cart) {
        const mapped = (res.data.cart.items || []).map(mapBackendItemToCartItem);
        setItems(mapped);
        setSummary(res.data.cart.summary);
      }

      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể tăng số lượng");
    }
  }

  // 4. Giảm số lượng sản phẩm
  async function decreaseQuantity(itemId: string) {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem || targetItem.quantity <= 1) return;

    try {
      const res = await updateCartItemQuantityApi(
        targetItem.product.sku,
        targetItem.quantity - 1
      );

      if (res.data?.cart) {
        const mapped = (res.data.cart.items || []).map(mapBackendItemToCartItem);
        setItems(mapped);
        setSummary(res.data.cart.summary);
      }

      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể giảm số lượng");
    }
  }

  // 5. Xóa sản phẩm khỏi giỏ hàng
  async function removeItem(itemId: string) {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    try {
      const res = await removeCartItemApi(targetItem.product.sku);

      if (res.data?.cart) {
        const mapped = (res.data.cart.items || []).map(mapBackendItemToCartItem);
        setItems(mapped);
        setSummary(res.data.cart.summary);
      }

      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể xóa sản phẩm");
    }
  }

  // 6. Áp dụng mã giảm giá
  function applyPromoCode() {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoError(true);
      setPromoMessage("Vui lòng nhập mã giảm giá.");
      return;
    }

    if (code === "PETLY10") {
      setAppliedPromo("PETLY10");
      setPromoError(false);
      setPromoMessage("Đã áp dụng mã giảm giá 10% thành công!");
    } else {
      setPromoError(true);
      setPromoMessage("Mã giảm giá không hợp lệ hoặc đã hết hạn.");
    }
  }

  return {
    items,
    summary,
    isLoading,
    errorMessage,
    promoCodeInput,
    promoMessage,
    promoError,
    appliedPromo,
    setPromoCodeInput,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    applyPromoCode,
    refreshCart: fetchCart,
  };
}
