"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCartApi } from "@/features/cart/services/cart.service";
import { createOrderApi } from "@/features/orders/services/order.service";
import type {
  CheckoutOrderItem,
  CheckoutSummary,
  PaymentMethodType,
  ShippingAddress,
  ShippingMethod,
} from "../types";

const DEFAULT_SHIPPING_ADDRESS: ShippingAddress = {
  fullName: "Khách hàng",
  phone: "0900000000",
  address: "Số 1 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội",
};

const DEFAULT_SHIPPING_METHOD: ShippingMethod = {
  id: "standard",
  name: "Giao hàng tiêu chuẩn",
  price: 30000,
  estimatedDelivery: "2–3 ngày làm việc",
};

const DEFAULT_SUMMARY: CheckoutSummary = {
  totalQuantity: 0,
  subtotal: 0,
  shippingFee: 30000,
  discount: 0,
  total: 30000,
};

type CheckoutCartData = {
  items: CheckoutOrderItem[];
  summary: CheckoutSummary | null;
};

async function getCheckoutCartData(): Promise<CheckoutCartData> {
  const response = await getCartApi();
  const cart = response.data?.cart;

  if (!cart) {
    return { items: [], summary: null };
  }

  return {
    items: (cart.items || []).map((item) => ({
      id: item.id || item.sku,
      productId: item.productId,
      name: item.name,
      description:
        item.description || (item.label ? `Phân loại: ${item.label}` : ""),
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      image: item.image || "/images/products/royal-canin-mini-adult.png",
    })),
    summary: cart.summary
      ? {
          totalQuantity: cart.summary.totalQuantity,
          subtotal: cart.summary.subtotal,
          shippingFee: cart.summary.shippingFee || 30000,
          discount: cart.summary.discount || 0,
          total: cart.summary.total,
        }
      : null,
  };
}

export function useCheckout() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cod");
  const [items, setItems] = useState<CheckoutOrderItem[]>([]);
  const [address] = useState<ShippingAddress>(DEFAULT_SHIPPING_ADDRESS);
  const [summary, setSummary] = useState<CheckoutSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const applyCartData = useCallback((data: CheckoutCartData) => {
    setItems(data.items);
    if (data.summary) setSummary(data.summary);
  }, []);

  const loadCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      applyCartData(await getCheckoutCartData());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Không thể tải giỏ hàng.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyCartData]);

  useEffect(() => {
    let isActive = true;

    getCheckoutCartData()
      .then((data) => {
        if (isActive) applyCartData(data);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(
            error instanceof Error ? error.message : "Không thể tải giỏ hàng.",
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [applyCartData]);

  const handleSubmitOrder = useCallback(async () => {
    if (items.length === 0) {
      setSubmitError("Giỏ hàng đang trống, không thể thanh toán.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const response = await createOrderApi({
        items: items.map((item) => ({
          productId: item.productId,
          variantSku: item.sku,
          qty: item.quantity,
        })),
        shippingAddress: {
          recipientName: address.fullName,
          phone: address.phone,
          street: address.address,
          province: "TP. Hồ Chí Minh",
          district: "Quận 1",
          ward: "Phường Bến Nghé",
        },
        guestInfo: {
          name: address.fullName,
          phone: address.phone,
        },
        paymentMethod: "COD",
      });

      const order = response.data?.order;
      window.dispatchEvent(new Event("cart-updated"));

      const queryParams = new URLSearchParams({
        orderCode: order?.orderCode || "",
        total: String(order?.total ?? summary.total),
        paymentMethod: order?.paymentMethod || "COD",
        createdAt: order?.createdAt || new Date().toISOString(),
      });

      router.push(`/checkout/result?${queryParams.toString()}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi tạo đơn hàng.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [address, items, router, summary.total]);

  return {
    address,
    handleSubmitOrder,
    isLoading,
    isSubmitting,
    items,
    loadCart,
    loadError,
    paymentMethod,
    setPaymentMethod,
    submitError,
    summary,
    shippingMethod: DEFAULT_SHIPPING_METHOD,
  };
}
