"use client";

// =============================================================
// features/checkout/index.tsx
// Màn hình Thanh toán: Tải sản phẩm từ API giỏ hàng hiện tại (MongoDB)
// =============================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { DeliveryAddressCard } from "./components/delivery-address-card";
import { OrderReviewCard } from "./components/order-review-card";
import { PaymentMethodCard } from "./components/payment-method-card";
import { ShippingMethodCard } from "./components/shipping-method-card";
import type {
  CheckoutOrderItem,
  CheckoutSummary,
  PaymentMethodType,
  ShippingAddress,
  ShippingMethod,
} from "./types";
import { getCartApi } from "@/features/cart/services/cart.service";
import { createOrderApi } from "@/features/orders/services/order.service";

export * from "./types";

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

export function CheckoutView() {
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cod");
  const [items, setItems] = useState<CheckoutOrderItem[]>([]);
  const [address, setAddress] = useState<ShippingAddress>(DEFAULT_SHIPPING_ADDRESS);
  const [shippingMethod] = useState<ShippingMethod>(DEFAULT_SHIPPING_METHOD);
  const [summary, setSummary] = useState<CheckoutSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Gọi API cart có sẵn từ MongoDB để hiển thị lại thông tin đơn hàng
  useEffect(() => {
    async function loadCartData() {
      try {
        setIsLoading(true);
        const res = await getCartApi();
        const cart = res.data?.cart;

        if (cart) {
          // Format sản phẩm từ cart sang format hiển thị checkout
          const mappedItems: CheckoutOrderItem[] = (cart.items || []).map((item) => ({
            id: item.id || item.sku,
            name: item.name,
            description: item.description || (item.label ? `Phân loại: ${item.label}` : ""),
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            image: item.image || "/images/products/royal-canin-mini-adult.png",
          }));

          setItems(mappedItems);

          if (cart.summary) {
            setSummary({
              totalQuantity: cart.summary.totalQuantity,
              subtotal: cart.summary.subtotal,
              shippingFee: cart.summary.shippingFee || 30000,
              discount: cart.summary.discount || 0,
              total: cart.summary.total,
            });
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải giỏ hàng cho checkout:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCartData();
  }, []);

  // 2. Gửi đơn hàng khi bấm Đặt hàng & thanh toán
  async function handleSubmitOrder() {
    if (items.length === 0) {
      alert("Giỏ hàng đang trống, không thể thanh toán.");
      return;
    }

    try {
      setIsSubmitting(true);

      await createOrderApi({
        items: items.map((item) => {
          const productId = item.id.includes("_") ? item.id.split("_")[0] : item.id;
          return {
            productId,
            variantSku: item.sku,
            qty: item.quantity,
          };
        }),
        shippingAddress: {
          recipientName: address.fullName,
          phone: address.phone,
          street: address.address,
          province: "Hà Nội",
          district: "Cầu Giấy",
          ward: "Dịch Vọng",
        },
        guestInfo: {
          name: address.fullName,
          phone: address.phone,
        },
        paymentMethod: paymentMethod === "vnpay" ? "ONLINE" : "COD",
      });

      // Cập nhật lại số lượng giỏ hàng trên Header
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart-updated"));
      }

      router.push("/checkout/result");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo đơn hàng.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Giao diện khi giỏ hàng trống
  if (!isLoading && items.length === 0) {
    return (
      <div className="w-full py-16 text-center">
        <h2 className="text-2xl font-bold text-ink">Giỏ hàng của bạn đang trống</h2>
        <p className="mt-2 text-sm text-muted">Vui lòng chọn sản phẩm vào giỏ trước khi tiến hành thanh toán.</p>
        <Link
          href="/listProduct/allProducts"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 1. Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-brand transition-colors">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/cart" className="hover:text-brand transition-colors">
                Giỏ hàng
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-ink">Thanh toán</li>
          </ol>
        </nav>

        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-100/80">
          Bước 2 / 3 · Đặt hàng
        </span>
      </div>

      {/* 2. Tiêu đề trang */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink tracking-tight">
          Thanh toán
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Kiểm tra thông tin giao hàng và hoàn tất đơn mua của bạn.
        </p>
      </div>

      {/* 3. Bố cục 2 cột chính */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT TRÁI: Địa chỉ giao hàng & Phương thức */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <DeliveryAddressCard address={address} />
          <ShippingMethodCard method={shippingMethod} />
          <PaymentMethodCard
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
          />
          <p className="text-xs text-muted leading-relaxed">
            Bằng việc đặt hàng, bạn đồng ý với Điều khoản mua hàng và Chính sách bảo mật của Petly.
          </p>
        </div>

        {/* CỘT PHẢI: Xem lại đơn hàng & Đặt hàng */}
        <div className="lg:col-span-5 xl:col-span-4">
          <OrderReviewCard
            items={items}
            summary={summary}
            paymentMethod={paymentMethod}
            onSubmitOrder={handleSubmitOrder}
          />
        </div>
      </div>
    </div>
  );
}

export default CheckoutView;
