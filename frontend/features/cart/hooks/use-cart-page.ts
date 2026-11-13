// =============================================================
// features/cart/hooks/use-cart-page.ts
// Hook quản lý dữ liệu giỏ hàng, kết nối API backend bằng useEffect
// =============================================================

import { useEffect, useMemo, useState } from "react";
import { useVoucherQuote } from "@/lib/use-voucher-quote";
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

  discount: 0,
  total: 0,
};

export function useCartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const voucherItems = useMemo(
    () => items.map((item) => ({ productId: item.product.productId, variantSku: item.product.sku, qty: item.quantity })),
    [items],
  );
  const voucher = useVoucherQuote({ items: voucherItems, remember: true });

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

        setSummary(backendCart.summary || DEFAULT_SUMMARY);
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
  }, []);

  // 3. Tăng số lượng sản phẩm
  async function increaseQuantity(itemId: string) {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    // Validate kiểm tra tồn kho trước khi tăng số lượng
    const maxStock = targetItem.product.availableStock ?? targetItem.product.stock;
    if (maxStock !== undefined && targetItem.quantity >= maxStock) {
      return;
    }

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

  // 6. Mã giảm giá do server tính; ở đây chỉ hiển thị
  const discount = voucher.applied?.discount ?? 0;
  const summaryWithVoucher: CartSummary = {
    ...summary,
    discount,
    total: Math.max(0, summary.subtotal - discount),
  };

  return {
    items,
    summary: summaryWithVoucher,
    isLoading,
    errorMessage,
    voucher,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    refreshCart: fetchCart,
  };
}
