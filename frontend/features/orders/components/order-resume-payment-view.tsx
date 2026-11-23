"use client";

import Link from "next/link";
import React from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Lock,
  XCircle,
} from "lucide-react";
import { VietQrTransferPanel } from "@/components/payment/vietqr-transfer-panel";
import { useOrderResumePayment } from "../hooks/use-order-resume-payment";

type OrderResumePaymentViewProps = {
  orderId: string;
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function OrderResumePaymentView({ orderId }: OrderResumePaymentViewProps) {
  const {
    session,
    isLoading,
    isChecking,
    isRenewing,
    isConverting,
    errorMessage,
    errorStatus,
    copiedField,
    secondsLeft,
    isExpired,
    reloadSession,
    handleManualCheck,
    handleCopy,
    handleRenewSession,
    handleConvertToCod,
  } = useOrderResumePayment(orderId);

  const detailHref = `/orders/${encodeURIComponent(orderId)}`;
  const loginHref = `/login?next=${encodeURIComponent(`/orders/${orderId}/pay`)}`;

  return (
    <div className="mx-auto w-full max-w-3xl py-2 sm:py-4">
      {/* Breadcrumb & nút quay lại */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Đường dẫn"
          className="flex flex-wrap items-center gap-1.5 text-xs text-muted"
        >
          <Link href="/" className="transition-colors hover:text-brand">
            Trang chủ
          </Link>
          <ChevronRight className="size-3.5 text-muted" aria-hidden="true" />
          <Link href="/orders" className="transition-colors hover:text-brand">
            Đơn hàng của tôi
          </Link>
          <ChevronRight className="size-3.5 text-muted" aria-hidden="true" />
          <Link href={detailHref} className="transition-colors hover:text-brand">
            {session ? `#${session.orderCode}` : "Chi tiết đơn hàng"}
          </Link>
          <ChevronRight className="size-3.5 text-muted" aria-hidden="true" />
          <span className="font-semibold text-ink">Thanh toán trực tuyến</span>
        </nav>

        <Link
          href={detailHref}
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Quay lại chi tiết đơn hàng</span>
        </Link>
      </div>

      {/* Trạng thái đang tải */}
      {isLoading && (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-xs">
          <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-brand border-r-transparent" />
          <p className="mt-4 text-sm text-muted">
            Đang tải thông tin thanh toán của đơn hàng...
          </p>
        </div>
      )}

      {/* Chưa đăng nhập (401) */}
      {!isLoading && !session && errorStatus === 401 && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-brand/20 bg-brand-subtle text-brand">
            <Lock className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">
            Cần đăng nhập để tiếp tục thanh toán
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Vui lòng đăng nhập bằng tài khoản đã đặt đơn hàng này để xem mã
            VietQR và hoàn tất thanh toán.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={loginHref}
              className="inline-flex min-h-11 items-center rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Đăng nhập ngay
            </Link>
            <Link
              href="/orders"
              className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Về Đơn hàng của tôi
            </Link>
          </div>
        </div>
      )}

      {/* Không tìm thấy / Sai quyền / Lỗi kết nối khi chưa có session */}
      {!isLoading && !session && errorStatus !== 401 && (
        <div
          role="alert"
          className="rounded-2xl border border-line bg-surface p-8 text-center shadow-xs"
        >
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-danger/20 bg-danger-subtle text-danger">
            <AlertCircle className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">
            {errorStatus === 404 || errorStatus === 400
              ? "Không tìm thấy đơn hàng"
              : errorStatus === 403
                ? "Không có quyền truy cập"
                : "Chưa thể tải phiên thanh toán"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {errorMessage ||
              "Không tìm thấy đơn hàng yêu cầu hoặc bạn không có quyền xem đơn hàng này."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {errorStatus !== 404 && errorStatus !== 400 && errorStatus !== 403 && (
              <button
                type="button"
                onClick={reloadSession}
                className="min-h-11 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Thử lại
              </button>
            )}
            <Link
              href="/orders"
              className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Quay lại danh sách đơn hàng
            </Link>
          </div>
        </div>
      )}

      {/* Trạng thái đơn đã thanh toán hoàn tất */}
      {!isLoading && session?.state === "already_paid" && (
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-xs">
          <div className="text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-success/20 bg-success-subtle text-success">
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-ink">
              Thanh toán thành công!
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Đơn hàng{" "}
              <strong className="font-mono text-ink">
                #{session.orderCode}
              </strong>{" "}
              đã được xác nhận thanh toán đủ. Hệ thống sẽ xử lý và giao hàng
              trong thời gian sớm nhất.
            </p>
          </div>

          <div className="my-6 space-y-2.5 rounded-xl border border-line bg-canvas p-5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">Mã đơn hàng</span>
              <span className="font-mono font-bold text-ink">
                #{session.orderCode}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">Tổng thanh toán</span>
              <span className="font-bold text-success tabular-nums">
                {formatVND(session.total)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">Phương thức</span>
              <span className="font-semibold text-ink">
                Chuyển khoản trực tuyến (VietQR)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={detailHref}
              className="inline-flex min-h-11 items-center rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Xem chi tiết đơn hàng
            </Link>
            <Link
              href="/orders"
              className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Danh sách đơn hàng
            </Link>
          </div>
        </div>
      )}

      {/* Trạng thái đơn đã hủy */}
      {!isLoading && session?.state === "cancelled" && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-danger/20 bg-danger-subtle text-danger">
            <XCircle className="size-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">
            Đơn hàng đã bị hủy
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Đơn hàng{" "}
            <strong className="font-mono text-ink">
              #{session.orderCode}
            </strong>{" "}
            đã chuyển sang trạng thái Đã hủy nên không thể tiếp tục thanh toán
            trực tuyến.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={detailHref}
              className="inline-flex min-h-11 items-center rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Quay lại chi tiết đơn hàng
            </Link>
            <Link
              href="/orders"
              className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Danh sách đơn hàng
            </Link>
          </div>
        </div>
      )}

      {/* Trạng thái đơn đã đổi sang COD hoặc không phải ONLINE */}
      {!isLoading && session?.state === "not_online" && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-brand/20 bg-brand-subtle text-brand">
            <Banknote className="size-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">
            {session.paymentMethod === "COD"
              ? "Đơn hàng thanh toán khi nhận hàng (COD)"
              : "Đơn hàng không hỗ trợ chuyển khoản trực tuyến"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {session.message ||
              "Phương thức thanh toán hiện tại của đơn hàng này không yêu cầu chuyển khoản qua mã VietQR."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={detailHref}
              className="inline-flex min-h-11 items-center rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Xem chi tiết đơn hàng
            </Link>
            <Link
              href="/orders"
              className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Danh sách đơn hàng
            </Link>
          </div>
        </div>
      )}

      {/* Trạng thái hợp lệ -> Hiển thị VietQR để tiếp tục thanh toán */}
      {!isLoading && session?.state === "eligible" && session.paymentInfo && (
        <div className="space-y-4">
          <VietQrTransferPanel
            paymentInfo={session.paymentInfo}
            secondsLeft={secondsLeft}
            isExpired={isExpired}
            isChecking={isChecking}
            isRenewing={isRenewing}
            isConverting={isConverting}
            copiedField={copiedField}
            errorMessage={errorMessage}
            onManualCheck={handleManualCheck}
            onCopy={handleCopy}
            onRenewSession={() => void handleRenewSession()}
            onConvertToCod={() => void handleConvertToCod()}
          />
        </div>
      )}
    </div>
  );
}

