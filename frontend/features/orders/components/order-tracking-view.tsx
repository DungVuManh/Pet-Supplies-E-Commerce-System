"use client";

// =============================================================
// features/orders/components/order-tracking-view.tsx
// Component Tra cứu đơn hàng theo Mã đơn hàng và Số điện thoại
// Gọi API thật từ MongoDB, hiển thị kết quả theo dạng BẢNG
// =============================================================

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Package,
  Phone,
  AlertCircle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  HelpCircle,
  FileText,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

// Kiểu dữ liệu đơn hàng trả về từ API tra cứu
type LookupOrderItem = {
  productId: string;
  variantSku: string;
  name: string;
  image: string;
  unitPrice: number;
  qty: number;
  totalPrice: number;
};

type LookupOrderData = {
  orderCode: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  channel: string;
  recipientName: string;
  phone: string;
  shippingAddress: string;
  carrier: string;
  trackingNumber: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  promotionCode?: string | null;
  total: number;
  items: LookupOrderItem[];
};

// Hàm định dạng tiền tệ VND
function formatVND(value: number): string {
  return (value || 0).toLocaleString("vi-VN") + " đ";
}

// Hàm định dạng thời gian
function formatDateTime(dateStr: string): string {
  if (!dateStr) return "---";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Render nhãn và màu sắc trạng thái đơn hàng
function renderOrderStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <Clock className="size-3.5" />
          Chờ xử lý
        </span>
      );
    case "confirmed":
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
          <Clock className="size-3.5" />
          Đang chuẩn bị hàng
        </span>
      );
    case "shipping":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-200">
          <Truck className="size-3.5" />
          Đang giao hàng
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="size-3.5" />
          Giao thành công
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
          <XCircle className="size-3.5" />
          Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
          <HelpCircle className="size-3.5" />
          {status}
        </span>
      );
  }
}

// Render nhãn trạng thái thanh toán
function renderPaymentStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
          Đã thanh toán
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
          Chờ xác nhận thanh toán
        </span>
      );
    case "unpaid":
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-300">
          Chưa thanh toán
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
          Thanh toán thất bại
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
}

// Chuyển đổi phương thức thanh toán sang tiếng Việt
function formatPaymentMethod(method: string) {
  switch (method) {
    case "COD":
      return "Thanh toán khi nhận hàng (COD)";
    case "ONLINE":
      return "Thanh toán trực tuyến (Chuyển khoản / Cổng thanh toán)";
    case "CASH":
      return "Tiền mặt tại quầy";
    default:
      return method || "Không xác định";
  }
}

export function OrderTrackingView() {
  // State 2 ô input theo yêu cầu
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");

  // State quản lý gọi API thật
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<LookupOrderData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Xử lý submit tra cứu đơn hàng
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCode = orderCode.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedCode) {
      setErrorMessage("Vui lòng nhập Mã đơn hàng.");
      return;
    }
    if (!trimmedPhone) {
      setErrorMessage("Vui lòng nhập Số điện thoại nhận hàng.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setOrderData(null);
    setHasSearched(true);

    try {
      // Gọi API thật từ MongoDB thông qua Next.js rewrite / backend
      const params = new URLSearchParams({
        orderCode: trimmedCode,
        phone: trimmedPhone,
      });

      const response = await fetch(`/api/v1/orders/lookup?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không tìm thấy thông tin đơn hàng hoặc số điện thoại không khớp."
        );
      }

      setOrderData(data.data);
    } catch (err: any) {
      setErrorMessage(
        err.message || "Đã xảy ra lỗi khi tra cứu đơn hàng. Vui lòng thử lại sau."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form tra cứu
  const handleReset = () => {
    setOrderCode("");
    setPhone("");
    setOrderData(null);
    setErrorMessage(null);
    setHasSearched(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-5xl">
      {/* Breadcrumb điều hướng */}
      <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="size-3.5 text-slate-400" />
        <span className="font-semibold text-ink">Tra cứu đơn hàng</span>
      </nav>

      {/* Header tiêu đề trang */}
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-50 text-blue-600 mb-3">
          <Package className="size-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Tra cứu đơn hàng
        </h1>
        <p className="text-sm text-muted mt-1.5">
          Nhập mã đơn hàng và số điện thoại người nhận để kiểm tra nhanh trạng thái xử lý và vận chuyển.
        </p>
      </div>

      {/* Card Form nhập thông tin tra cứu gồm 2 input + nút Tra cứu */}
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm mb-8">
        <form onSubmit={handleLookup} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input 1: Mã đơn hàng */}
            <div>
              <label
                htmlFor="orderCodeInput"
                className="block text-sm font-semibold text-ink mb-2"
              >
                Mã đơn hàng <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
                <input
                  id="orderCodeInput"
                  type="text"
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value)}
                  placeholder="#ORD..."
                  className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Mã đơn hàng được gửi sau khi thanh hoặc đặt hàng thành công .
              </p>
            </div>

            {/* Input 2: Số điện thoại */}
            <div>
              <label
                htmlFor="phoneInput"
                className="block text-sm font-semibold text-ink mb-2"
              >
                Số điện thoại người nhận <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
                <input
                  id="phoneInput"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+84......"
                  className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Số điện thoại dùng để đặt hàng hoặc nhận hàng.
              </p>
            </div>
          </div>

          {/* Nút thao tác: Tra cứu (Màu xanh dương theo hệ thống) */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang tra cứu...</span>
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  <span>Tra cứu đơn hàng</span>
                </>
              )}
            </button>

            {(orderCode || phone || orderData) && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-muted hover:text-ink hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="size-3.5" />
                Làm mới
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Thông báo lỗi nếu tra cứu không thành công */}
      {errorMessage && (
        <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-sm text-rose-800 flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold">Tra cứu không thành công</p>
            <p className="mt-1 text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Hiển thị kết quả tra cứu THEO DẠNG BẢNG */}
      {orderData && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header kết quả */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <span>Kết quả tra cứu đơn hàng</span>
                <span className="text-blue-600 font-mono">#{orderData.orderCode}</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                Thời gian đặt hàng: {formatDateTime(orderData.createdAt)}
              </p>
            </div>
            <div>{renderOrderStatusBadge(orderData.orderStatus)}</div>
          </div>

          {/* BẢNG 1: BẢNG THÔNG TIN TỔNG QUAN ĐƠN HÀNG */}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-line">
              <h3 className="font-bold text-ink text-sm sm:text-base flex items-center gap-2">
                <FileText className="size-4 text-blue-600" />
                Bảng thông tin đơn hàng
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <tbody>
                  <tr className="border-b border-line">
                    <th className="w-1/4 bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Mã đơn hàng
                    </th>
                    <td className="w-1/4 px-6 py-3.5 font-bold text-blue-600 font-mono">
                      {orderData.orderCode}
                    </td>
                    <th className="w-1/4 bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Thời gian đặt
                    </th>
                    <td className="w-1/4 px-6 py-3.5 text-ink">
                      {formatDateTime(orderData.createdAt)}
                    </td>
                  </tr>

                  <tr className="border-b border-line">
                    <th className="bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Trạng thái đơn hàng
                    </th>
                    <td className="px-6 py-3.5">
                      {renderOrderStatusBadge(orderData.orderStatus)}
                    </td>
                    <th className="bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Trạng thái thanh toán
                    </th>
                    <td className="px-6 py-3.5">
                      {renderPaymentStatusBadge(orderData.paymentStatus)}
                    </td>
                  </tr>

                  <tr className="border-b border-line">
                    <th className="bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Phương thức thanh toán
                    </th>
                    <td className="px-6 py-3.5 text-ink font-medium">
                      {formatPaymentMethod(orderData.paymentMethod)}
                    </td>
                    <th className="bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Đơn vị vận chuyển
                    </th>
                    <td className="px-6 py-3.5 text-ink">
                      {orderData.carrier} {orderData.trackingNumber && orderData.trackingNumber !== "Chưa có" ? `(${orderData.trackingNumber})` : ""}
                    </td>
                  </tr>

                  <tr className="border-b border-line">
                    <th className="bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Người nhận hàng
                    </th>
                    <td className="px-6 py-3.5 text-ink font-semibold">
                      {orderData.recipientName}
                    </td>
                    <th className="bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Số điện thoại
                    </th>
                    <td className="px-6 py-3.5 text-ink font-medium">
                      {orderData.phone}
                    </td>
                  </tr>

                  <tr>
                    <th className="bg-slate-50/40 px-6 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">
                      Địa chỉ nhận hàng
                    </th>
                    <td colSpan={3} className="px-6 py-3.5 text-ink">
                      {orderData.shippingAddress}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* BẢNG 2: BẢNG DANH SÁCH CHI TIẾT SẢN PHẨM ĐÃ ĐẶT */}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-line">
              <h3 className="font-bold text-ink text-sm sm:text-base flex items-center gap-2">
                <Package className="size-4 text-blue-600" />
                Bảng danh sách sản phẩm ({orderData.items?.length || 0} món)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-line bg-slate-50/50 text-xs uppercase text-muted tracking-wider">
                    <th className="px-4 py-3.5 text-center w-12 font-semibold">STT</th>
                    <th className="px-4 py-3.5 text-center w-24 font-semibold">Ảnh sản phẩm</th>
                    <th className="px-4 py-3.5 font-semibold">Tên sản phẩm</th>
                    <th className="px-4 py-3.5 font-semibold text-center w-36">Mã SKU</th>
                    <th className="px-4 py-3.5 font-semibold text-right w-32">Đơn giá</th>
                    <th className="px-4 py-3.5 font-semibold text-center w-24">Số lượng</th>
                    <th className="px-4 py-3.5 font-semibold text-right w-36">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orderData.items?.map((item, index) => (
                    <tr key={`${item.variantSku}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                      {/* STT */}
                      <td className="px-4 py-4 text-center font-medium text-muted text-xs">
                        {index + 1}
                      </td>

                      {/* Ảnh sản phẩm mua */}
                      <td className="px-4 py-4 text-center">
                        <div className="relative mx-auto size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-white shadow-xs p-1">
                          {item.image && !imageErrors[`${item.variantSku}-${index}`] ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="(max-width: 640px) 64px, 80px"
                              className="object-contain p-1 rounded-lg"
                              onError={() =>
                                setImageErrors((prev) => ({
                                  ...prev,
                                  [`${item.variantSku}-${index}`]: true,
                                }))
                              }
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-muted">
                              <Package className="size-6 text-slate-300" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Tên sản phẩm */}
                      <td className="px-4 py-4">
                        <p className="font-semibold text-ink line-clamp-2 leading-snug">
                          {item.name}
                        </p>
                      </td>

                      {/* Mã SKU */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                          {item.variantSku}
                        </span>
                      </td>

                      {/* Đơn giá */}
                      <td className="px-4 py-4 text-right font-medium text-ink">
                        {formatVND(item.unitPrice)}
                      </td>

                      {/* Số lượng */}
                      <td className="px-4 py-4 text-center font-semibold text-ink">
                        x{item.qty}
                      </td>

                      {/* Thành tiền */}
                      <td className="px-4 py-4 text-right font-bold text-ink">
                        {formatVND(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Hàng tổng kết chi phí cuối bảng */}
                <tfoot className="bg-slate-50/60 border-t-2 border-line">
                  <tr className="border-b border-line/60">
                    <td colSpan={5} className="px-6 py-2.5 text-right text-xs font-medium text-muted">
                      Tạm tính:
                    </td>
                    <td colSpan={2} className="px-6 py-2.5 text-right font-semibold text-ink">
                      {formatVND(orderData.subtotal)}
                    </td>
                  </tr>

                  {orderData.discount > 0 && (
                    <tr className="border-b border-line/60">
                      <td colSpan={5} className="px-6 py-2.5 text-right text-xs font-medium text-rose-600">
                        Giảm giá{orderData.promotionCode ? ` (${orderData.promotionCode})` : ""}:
                      </td>
                      <td colSpan={2} className="px-6 py-2.5 text-right font-semibold text-rose-600">
                        -{formatVND(orderData.discount)}
                      </td>
                    </tr>
                  )}

                  <tr className="bg-blue-50/40">
                    <td colSpan={5} className="px-6 py-4 text-right text-sm font-bold text-ink uppercase tracking-wide">
                      Tổng thanh toán:
                    </td>
                    <td colSpan={2} className="px-6 py-4 text-right text-base sm:text-lg font-extrabold text-blue-600">
                      {formatVND(orderData.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trạng thái chưa tìm hoặc đã tìm không ra */}
      {!orderData && !isLoading && !errorMessage && hasSearched && (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted">
          Không có kết quả nào được tìm thấy.
        </div>
      )}
    </div>
  );
}

export default OrderTrackingView;

