"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearGuestCart,
  getCartApi,
  removeCartItemApi,
} from "@/features/cart/services/cart.service";
import {
  clearBuyNowSession,
  createOrderApi,
  getBuyNowSession,
} from "@/features/orders/services/order.service";
import { getCheckoutAddress, type CheckoutAddress } from "../services/checkout.service";
import { useAuth } from "@/features/auth/auth-provider";
import { useVoucherQuote } from "@/lib/use-voucher-quote";
import { forgetVoucherCode, voucherQuotePhone } from "@/lib/voucher";

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
  // shippingFee: 30000,
  // discount: 0,z``
  total: 0,
};

type CheckoutCartData = {
  items: CheckoutOrderItem[];
  summary: CheckoutSummary | null;
};

// Hàm validate địa chỉ giao hàng dùng trong hook
export function validateCheckoutAddress(address: CheckoutAddress): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!address.recipientName?.trim()) {
    errors.recipientName = "Vui lòng nhập họ tên người nhận.";
  } else if (address.recipientName.trim().length < 2) {
    errors.recipientName = "Họ tên người nhận phải có ít nhất 2 ký tự.";
  }

  if (address.email && address.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) {
      errors.email = "Email không hợp lệ (ví dụ: ten@domain.com).";
    }
  }

  if (!address.phone?.trim()) {
    errors.phone = "Vui lòng nhập số điện thoại.";
  } else if (!/^[0-9+() -]{8,10}$/.test(address.phone.trim())) {
    errors.phone = "Số điện thoại không hợp lệ (8 - 15 chữ số).";
  }

  if (!address.province?.trim()) {
    errors.province = "Vui lòng chọn Tỉnh / Thành phố.";
  }

  if (!address.district?.trim()) {
    errors.district = "Vui lòng chọn Quận / Huyện.";
  }

  if (!address.ward?.trim()) {
    errors.ward = "Vui lòng chọn Phường / Xã.";
  }

  if (!address.street?.trim()) {
    errors.street = "Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường).";
  } else if (address.street.trim().length < 3) {
    errors.street = "Địa chỉ cụ thể quá ngắn (ít nhất 3 ký tự).";
  }

  return errors;
}

async function getCheckoutCartData(): Promise<CheckoutCartData> {
  const response = await getCartApi();
  const cart = response.data?.cart;

  if (!cart) {
    return { items: [], summary: null };
  }

  let cartItems = cart.items || [];

  // Chỉ lấy những sản phẩm đã được tick chọn từ giỏ hàng
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("petly_selected_cart_items");
      const selectedIds: string[] = stored ? JSON.parse(stored) : [];
      if (Array.isArray(selectedIds)) {
        cartItems = cartItems.filter((item) =>
          selectedIds.includes(item.id) || selectedIds.includes(item.sku)
        );
      }
    } catch {
      // ignore
    }
  }

  const items = cartItems.map((item) => ({
    id: item.id || item.sku,
    productId: item.productId,
    name: item.name,
    description:
      item.description || (item.label ? `Phân loại: ${item.label}` : ""),
    sku: item.sku,
    price: item.price,
    quantity: item.quantity,
    image: item.image || "/images/products/royal-canin-mini-adult.png",
  }));

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items,
    summary: {
      totalQuantity,
      subtotal,
      total: subtotal,
    },
  };
}

export function useCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams?.get("buyNow") === "1";
  const { status: authStatus, user } = useAuth();
  const isGuest = authStatus === "ready" && !user;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cod");
  const [items, setItems] = useState<CheckoutOrderItem[]>([]);
  const [address, setAddress] = useState<CheckoutAddress>({
    _id: "",
    recipientName: "",
    email: "",
    phone: "",
    province: "",
    district: "",
    ward: "",
    street: "",
    isDefault: false,
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<CheckoutSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const voucherItems = useMemo(
    () => items.map((item) => ({ productId: item.productId, variantSku: item.sku, qty: item.quantity })),
    [items],
  );
  // Mua ngay không dùng mã nhớ từ giỏ hàng, vì mã đó thuộc về các sản phẩm khác.
  const voucher = useVoucherQuote({
    items: voucherItems,
    phone: isGuest ? voucherQuotePhone(address.phone) : undefined,
    remember: !isBuyNow,
  });
  const { applied: appliedVoucher, refresh: refreshVoucher } = voucher;

  const applyCartData = useCallback((data: CheckoutCartData) => {
    setItems(data.items);
    if (data.summary) setSummary(data.summary);
  }, []);

  const loadCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      if (isBuyNow) {
        const buyNowData = getBuyNowSession();
        if (buyNowData?.item) {
          setItems([
            {
              id: buyNowData.item.id || buyNowData.item.sku,
              productId: buyNowData.item.productId,
              name: buyNowData.item.name,
              description:
                buyNowData.item.description ||
                (buyNowData.item.label ? `Phân loại: ${buyNowData.item.label}` : ""),
              sku: buyNowData.item.sku,
              price: buyNowData.item.price,
              quantity: buyNowData.item.quantity,
              image: buyNowData.item.image || "/images/products/royal-canin-mini-adult.png",
            },
          ]);
          if (buyNowData.summary) setSummary(buyNowData.summary);
        } else {
          setLoadError("Không tìm thấy thông tin sản phẩm Mua ngay. Vui lòng chọn lại sản phẩm.");
        }
      } else {
        applyCartData(await getCheckoutCartData());
      }
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Không thể tải giỏ hàng.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyCartData, isBuyNow]);

  // Handler cập nhật từng trường địa chỉ nhập vào và tự động xóa lỗi tương ứng
  const handleAddressChange = useCallback((field: keyof CheckoutAddress, value: string) => {
    setAddress((prev) => {
      const next = { ...prev, [field]: value };
      // Nếu thay đổi Tỉnh -> reset Quận & Phường
      if (field === "province") {
        next.district = "";
        next.ward = "";
      }
      // Nếu thay đổi Quận -> reset Phường
      else if (field === "district") {
        next.ward = "";
      }
      return next;
    });

    setAddressErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      if (field === "province") {
        delete next.district;
        delete next.ward;
      } else if (field === "district") {
        delete next.ward;
      }
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
              email: selectedAddress.email || user.email || "",
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

    // 2. Lấy dữ liệu sản phẩm để thanh toán:
    // - Chế độ Mua ngay: lấy trực tiếp từ session Mua ngay, không động chạm tới giỏ hàng thật
    // - Chế độ Giỏ hàng: Guest đọc từ localStorage, User đọc từ DB
    if (isBuyNow) {
      const buyNowData = getBuyNowSession();
      if (!buyNowData?.item) {
        if (isActive) {
          setItems([]);
          setLoadError("Không tìm thấy thông tin sản phẩm Mua ngay. Vui lòng quay lại chọn sản phẩm.");
          setIsLoading(false);
        }
        return;
      }

      if (isActive) {
        setItems([
          {
            id: buyNowData.item.id || buyNowData.item.sku,
            productId: buyNowData.item.productId,
            name: buyNowData.item.name,
            description:
              buyNowData.item.description ||
              (buyNowData.item.label ? `Phân loại: ${buyNowData.item.label}` : ""),
            sku: buyNowData.item.sku,
            price: buyNowData.item.price,
            quantity: buyNowData.item.quantity,
            image: buyNowData.item.image || "/images/products/royal-canin-mini-adult.png",
          },
        ]);
        if (buyNowData.summary) setSummary(buyNowData.summary);
        setIsLoading(false);
      }
    } else {
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
    }

    return () => {
      isActive = false;
    };
  }, [applyCartData, authStatus, isBuyNow, user]);

  const handleSubmitOrder = useCallback(async () => {
    if (items.length === 0) {
      setSubmitError(isBuyNow ? "Không tìm thấy sản phẩm Mua ngay." : "Giỏ hàng đang trống, không thể thanh toán.");
      return;
    }

    // Validate form địa chỉ trong hooks
    const errors = validateCheckoutAddress(address);

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
          email: address.email?.trim() || undefined,
        },
        email: address.email?.trim() || undefined,
        paymentMethod:
          paymentMethod === "vnpay" || paymentMethod === "sepay"
            ? ("ONLINE" as const)
            : ("COD" as const),
        isBuyNow,
        ...(appliedVoucher ? { promotionCode: appliedVoucher.code, expectedDiscount: appliedVoucher.discount } : {}),
      };

      const response = await createOrderApi(orderPayload);
      const order = response.data?.order;

      // Xử lý dọn dẹp sau khi đặt hàng thành công
      if (isBuyNow) {
        // Chỉ xóa session Mua ngay, KHÔNG động đến giỏ hàng thật của người dùng
        clearBuyNowSession();
      } else {
        forgetVoucherCode();
        // Xóa những sản phẩm đã đặt khỏi giỏ hàng (giữ lại các sản phẩm chưa tick mua)
        await Promise.allSettled(
          items.map((item) => removeCartItemApi(item.sku))
        );
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("petly_selected_cart_items");
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart-updated"));
      }

      setItems([]);

      const queryParams = new URLSearchParams({
        orderCode: order?.orderCode || "",
        total: String(order?.total ?? summary.total),
        paymentMethod: order?.paymentMethod || (paymentMethod === "cod" ? "COD" : "ONLINE"),
        createdAt: order?.createdAt || new Date().toISOString(),
        paymentProvider: paymentMethod,
        isPaid: String(order?.paymentStatus === "paid"),
      });
      if (order?.promotionCode) {
        queryParams.set("promotionCode", order.promotionCode);
        queryParams.set("discount", String(order.discount ?? 0));
      }

      router.push(`/checkout/result?${queryParams.toString()}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi tạo đơn hàng.",
      );
      // Mã vừa đổi: không tạo đơn, cập nhật lại tổng tiền và giữ nguyên giỏ hàng, biểu mẫu.
      const code = (error as { code?: string }).code;
      if (code === "VOUCHER_INVALID" || code === "VOUCHER_CHANGED") refreshVoucher();
    } finally {
      setIsSubmitting(false);
    }
  }, [address, appliedVoucher, isBuyNow, isGuest, items, paymentMethod, refreshVoucher, router, summary.total]);

  return {
    address,
    setAddress,
    handleAddressChange,
    addressErrors,
    isGuest,
    isBuyNow,
    handleSubmitOrder,
    isLoading,
    isSubmitting,
    items,
    loadCart,
    loadError,
    paymentMethod,
    setPaymentMethod,
    submitError,
    summary: appliedVoucher
      ? { ...summary, subtotal: appliedVoucher.subtotal, discount: appliedVoucher.discount, promotionCode: appliedVoucher.code, total: appliedVoucher.total }
      : summary,
    voucher,
    shippingMethod: DEFAULT_SHIPPING_METHOD,
  };
}
