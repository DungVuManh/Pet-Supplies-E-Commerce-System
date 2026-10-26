"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearGuestCart,
  getCartApi,
  removeCartItemApi,
} from "@/features/cart/services/cart.service";
import { createOrderApi } from "@/features/orders/services/order.service";
import { getCheckoutAddress, type CheckoutAddress } from "../services/checkout.service";
import { useAuth } from "@/features/auth/auth-provider";

import type {
  CheckoutOrderItem,
  CheckoutSummary,
  PaymentMethodType,
  ShippingMethod,
} from "../types";

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
  const { status: authStatus, user } = useAuth();
  const isGuest = authStatus === "ready" && !user;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cod");
  const [items, setItems] = useState<CheckoutOrderItem[]>([]);
  const [address, setAddress] = useState<CheckoutAddress>({
    _id: "",
    recipientName: "",
    phone: "",
    province: "",
    district: "",
    ward: "",
    street: "",
    isDefault: false,
    email: "",
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
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

  // Handler cập nhật từng trường địa chỉ nhập vào
  const handleAddressChange = useCallback((field: keyof CheckoutAddress, value: string) => {
    setAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
    setAddressErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  useEffect(() => {
    let isActive = true;

    // Chờ xác định trạng thái đăng nhập
    if (authStatus === "loading") return;

    // 1. Nếu là user đã đăng nhập: lấy địa chỉ giao hàng từ database
    if (user) {
      getCheckoutAddress()
        .then((addresses) => {
          if (!isActive) return;
          const selectedAddress =
            addresses.find((item) => item.isDefault) ?? addresses[0];

          if (selectedAddress) {
            setAddress({
              _id: selectedAddress._id,
              recipientName: selectedAddress.recipientName,
              email: selectedAddress.email || "",
              phone: selectedAddress.phone,
              province: selectedAddress.province,
              district: selectedAddress.district,
              ward: selectedAddress.ward,
              street: selectedAddress.street,
              isDefault: selectedAddress.isDefault,
            });
          }
        })
        .catch((err) => {
          console.warn("Không thể tải địa chỉ từ server:", err);
        });
    }

    // 2. Lấy giỏ hàng:
    // - Guest: tự động đọc từ localStorage của guest trong phiên
    // - User: đọc từ DB
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
  }, [applyCartData, authStatus, user]);

  const handleSubmitOrder = useCallback(async () => {
    if (items.length === 0) {
      setSubmitError("Giỏ hàng đang trống, không thể thanh toán.");
      return;
    }

    // Kiểm tra tính hợp lệ của địa chỉ giao hàng
    const errors: Record<string, string> = {};
    if (!address.recipientName?.trim()) {
      errors.recipientName = "Vui lòng nhập họ tên người nhận.";
    } else if (address.recipientName.trim().length < 2) {
      errors.recipientName = "Họ tên người nhận phải có ít nhất 2 ký tự.";
    }

    if (!address.phone?.trim()) {
      errors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!/^[0-9+() -]{8,15}$/.test(address.phone.trim())) {
      errors.phone = "Số điện thoại không hợp lệ (8 - 15 số).";
    }

    if (!address.province?.trim()) {
      errors.province = "Vui lòng nhập Tỉnh / Thành phố.";
    }
    if (!address.district?.trim()) {
      errors.district = "Vui lòng nhập Quận / Huyện.";
    }
    if (!address.ward?.trim()) {
      errors.ward = "Vui lòng nhập Phường / Xã.";
    }
    if (!address.street?.trim()) {
      errors.street = "Vui lòng nhập địa chỉ cụ thể / số nhà, tên đường.";
    }

    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors);
      setSubmitError("Vui lòng điền đầy đủ và chính xác thông tin địa chỉ giao hàng.");
      return;
    }

    setAddressErrors({});

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Gọi API POST /api/v1/orders lưu đơn hàng trực tiếp vào MongoDB
      const orderPayload = {
        items: items.map((item) => ({
          productId: item.productId,
          variantSku: item.sku,
          qty: item.quantity,
        })),
        shippingAddress: {
          recipientName: address.recipientName.trim(),
          phone: address.phone.trim(),
          province: address.province.trim(),
          district: address.district.trim(),
          ward: address.ward.trim(),
          street: address.street.trim(),
        },
        guestInfo: {
          name: address.recipientName.trim(),
          phone: address.phone.trim(),
        },
        paymentMethod: paymentMethod === "vnpay" ? ("ONLINE" as const) : ("COD" as const),
      };

      const response = await createOrderApi(orderPayload);
      const order = response.data?.order;

      // Xóa các sản phẩm đã mua khỏi giỏ hàng
      if (isGuest) {
        clearGuestCart();
      } else {
        await Promise.allSettled(
          items.map((item) => removeCartItemApi(item.sku))
        );
      }

      setItems([]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart-updated"));
      }

      const queryParams = new URLSearchParams({
        orderCode: order?.orderCode || "",
        total: String(order?.total ?? summary.total),
        paymentMethod: order?.paymentMethod || (paymentMethod === "vnpay" ? "ONLINE" : "COD"),
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
  }, [address, isGuest, items, paymentMethod, router, summary.total]);

  return {
    address,
    setAddress,
    handleAddressChange,
    addressErrors,
    isGuest,
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
