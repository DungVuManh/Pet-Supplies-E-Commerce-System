"use client";

// =============================================================
// features/staff/components/return-decision-panel.tsx
// Giao diện chi tiết yêu cầu hoàn trả & Bảng ra quyết định cho Staff
// =============================================================

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Badge, PageHeader, card } from "./staff-ui";
import type { StaffReturnDetail } from "../returns/types";
import {
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
} from "../returns/types";
import {
  submitStaffReturnDecision,
  StaffReturnApiError,
} from "../returns/api";

type ReturnDecisionPanelProps = {
  detail: StaffReturnDetail;
};

function formatVND(value: number | undefined | null): string {
  const num = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return num.toLocaleString("vi-VN") + " đ";
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes} · ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

export function ReturnDecisionPanel({ detail }: ReturnDecisionPanelProps) {
  const router = useRouter();
  const req = detail.returnRequest;

  // Zoom modal state
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Decision mode: null | "approve" | "reject"
  const [decisionMode, setDecisionMode] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyAccount = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPending = req.status === "pending";
  const isOnlinePaid = detail.paymentMethod === "ONLINE" && detail.paymentStatus === "paid";

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      await submitStaffReturnDecision(detail.id, { decision: "approve" });
      router.refresh();
      setDecisionMode(null);
    } catch (err) {
      setActionError(
        err instanceof StaffReturnApiError
          ? err.message
          : "Không thể phê duyệt yêu cầu hoàn trả. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 5) {
      setRejectionError("Vui lòng nhập lý do từ chối tối thiểu 5 ký tự.");
      return;
    }
    if (trimmed.length > 500) {
      setRejectionError("Lý do từ chối không được vượt quá 500 ký tự.");
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      setRejectionError("");
      await submitStaffReturnDecision(detail.id, {
        decision: "reject",
        rejectionReason: trimmed,
      });
      router.refresh();
      setDecisionMode(null);
    } catch (err) {
      setActionError(
        err instanceof StaffReturnApiError
          ? err.message
          : "Không thể từ chối yêu cầu hoàn trả. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusTone =
    req.status === "approved"
      ? "success"
      : req.status === "rejected"
      ? "danger"
      : "warning";

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          href="/staff/returns"
          className="inline-flex min-h-10 items-center font-medium text-brand hover:underline"
        >
          ← Quay lại danh sách yêu cầu hoàn trả
        </Link>
      </div>

      <PageHeader
        title={`Yêu cầu hoàn trả #${detail.orderCode}`}
        subtitle={`Gửi yêu cầu lúc ${formatDateTime(req.requestedAt)}`}
        action={
          <Badge tone={statusTone}>
            {RETURN_STATUS_LABELS[req.status] || req.status}
          </Badge>
        }
      />

      {/* Action Error Banner */}
      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {/* Main Grid: Left Column (Content) & Right Column (Sidebar) */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        {/* Left Column: Request Info, Photos & Items */}
        <div className="space-y-6">
          {/* Card 1: Lý do & Minh chứng */}
          <section className={`${card} p-6 space-y-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <h2 className="text-lg font-semibold text-ink">Thông tin yêu cầu hoàn trả</h2>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200/60">
                Lý do: {RETURN_REASON_LABELS[req.reason] || req.reason}
              </span>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Mô tả chi tiết từ khách hàng
              </p>
              <div className="mt-2 rounded-xl bg-canvas p-4 text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {req.description}
              </div>
            </div>

            {/* Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Hình ảnh minh chứng ({req.images?.length || 0})
                </p>
                {req.images && req.images.length > 0 && (
                  <span className="text-xs text-muted">Bấm vào ảnh để phóng to</span>
                )}
              </div>

              {req.images && req.images.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {req.images.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setZoomedImage(url)}
                      className="group relative h-28 w-28 sm:h-32 sm:w-32 rounded-xl overflow-hidden bg-canvas border border-line shadow-xs hover:ring-2 hover:ring-brand hover:border-transparent transition-all cursor-zoom-in"
                    >
                      <Image
                        src={url}
                        alt={`Ảnh minh chứng ${index + 1}`}
                        fill
                        sizes="128px"
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-mono text-white backdrop-blur-xs">
                        #{index + 1}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-canvas p-6 text-center text-sm text-muted">
                  Khách hàng không đính kèm hình ảnh minh chứng (Lý do chưa nhận được hàng).
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Sản phẩm trong đơn & Hoàn tồn kho */}
          <section className={`${card} p-6`}>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
              <h2 className="text-lg font-semibold text-ink">Sản phẩm trong đơn</h2>
              <span className="text-xs text-muted">{detail.items.length} món</span>
            </div>

            <ul className="divide-y divide-line">
              {detail.items.map((item) => (
                <li key={item.variantSku} className="flex items-center gap-4 py-4">
                  {item.image ? (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-canvas border border-line/60">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-canvas border border-line text-xs text-muted">
                      Ảnh
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink leading-snug">{item.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      SKU: <span className="font-mono">{item.variantSku}</span> · SL: <strong>{item.qty}</strong>
                    </p>
                    {isPending && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                        + Hoàn lại {item.qty} vào kho khi duyệt
                      </span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-ink">
                      {formatVND(item.totalPrice ?? (item.unitPrice * item.qty))}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatVND(item.unitPrice)} / món
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Total calculation */}
            <dl className="ml-auto mt-6 grid max-w-sm grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
              <dt className="text-muted">Tạm tính</dt>
              <dd className="text-right font-medium">{formatVND(detail.subtotal)}</dd>
              {detail.discount > 0 && (
                <>
                  <dt className="text-muted">Giảm giá</dt>
                  <dd className="text-right font-medium text-emerald-600">
                    -{formatVND(detail.discount)}
                  </dd>
                </>
              )}
              <dt className="text-muted">Phí vận chuyển</dt>
              <dd className="text-right font-medium">{formatVND(detail.shippingFee)}</dd>
              <dt className="text-base font-semibold text-ink">Tổng giá trị đơn</dt>
              <dd className="text-right text-base font-bold text-brand">
                {formatVND(detail.total)}
              </dd>
            </dl>
          </section>
        </div>

        {/* Right Column: Decision Box + Customer Info + Payment */}
        <aside className="space-y-6">
          {/* Card: Bảng ra quyết định (Decision Panel) */}
          <section className={`${card} p-6 space-y-4`}>
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-semibold text-ink">
                Quyết định xử lý
              </h3>
            </div>

            {isPending ? (
              decisionMode === null ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted leading-relaxed">
                    Vui lòng đối chiếu hình ảnh minh chứng và thông tin đơn hàng trước khi phê duyệt hoặc từ chối yêu cầu.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDecisionMode("approve")}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      Chấp nhận hoàn trả
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionMode("reject")}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                    >
                      Từ chối hoàn trả
                    </button>
                  </div>
                </div>
              ) : decisionMode === "approve" ? (
                /* Xác nhận chấp nhận */
                <div className="space-y-3.5 rounded-xl bg-emerald-50/70 p-4 border border-emerald-200/80">
                  <h4 className="text-sm font-bold text-emerald-900">
                    Xác nhận chấp nhận hoàn trả?
                  </h4>
                  <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
                    <li>Đơn hàng sẽ chuyển sang trạng thái <strong>Đã hoàn trả</strong>.</li>
                    <li>Tồn kho các sản phẩm sẽ được tự động cộng lại.</li>
                    {isOnlinePaid && (
                      <li>Đơn hàng sẽ được đánh dấu <strong>Cần hoàn tiền</strong>.</li>
                    )}
                  </ul>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="flex-1 inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Đang xử lý..." : "Xác nhận duyệt"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionMode(null)}
                      disabled={isSubmitting}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:bg-canvas transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                /* Nhập lý do từ chối */
                <div className="space-y-3.5 rounded-xl bg-rose-50/70 p-4 border border-rose-200/80">
                  <h4 className="text-sm font-bold text-rose-900">
                    Từ chối yêu cầu hoàn trả
                  </h4>
                  <div>
                    <label htmlFor="rejectionReason" className="block text-xs font-semibold text-rose-800 mb-1.5">
                      Lý do từ chối (bắt buộc 5–500 ký tự) *
                    </label>
                    <textarea
                      id="rejectionReason"
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => {
                        setRejectionReason(e.target.value);
                        setRejectionError("");
                      }}
                      placeholder="Nhập lý do chi tiết từ chối yêu cầu hoàn trả (khách hàng sẽ đọc được lý do này)..."
                      className="w-full rounded-lg border border-rose-300 p-2.5 text-xs text-ink placeholder:text-muted bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <div className="flex justify-between items-center mt-1.5">
                      {rejectionError ? (
                        <p className="text-[11px] text-rose-600 font-medium">{rejectionError}</p>
                      ) : (
                        <span />
                      )}
                      <span className="text-[11px] text-muted">
                        {rejectionReason.trim().length} / 500
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="flex-1 inline-flex min-h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Đang xử lý..." : "Xác nhận từ chối"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDecisionMode(null);
                        setRejectionError("");
                      }}
                      disabled={isSubmitting}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:bg-canvas transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* Đã xử lý */
              <div className="space-y-3 text-xs">
                <div
                  className={`p-4 rounded-xl border ${
                    req.status === "approved"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <p className="font-bold mb-1 text-sm">
                    {req.status === "approved"
                      ? "✓ Đã chấp nhận yêu cầu hoàn trả"
                      : "✕ Đã từ chối yêu cầu hoàn trả"}
                  </p>
                  <p className="text-[11px] text-muted mb-2">
                    Người duyệt: <strong>{req.reviewedByName || "Nhân viên"}</strong> · Lúc:{" "}
                    {formatDateTime(req.reviewedAt)}
                  </p>
                  {req.rejectionReason && (
                    <div className="mt-2.5 pt-2.5 border-t border-rose-200">
                      <p className="font-semibold text-rose-800">Lý do từ chối:</p>
                      <p className="mt-1 text-ink leading-relaxed">{req.rejectionReason}</p>
                    </div>
                  )}
                  {req.refundRequired && (
                    <div className="mt-2.5 pt-2.5 border-t border-emerald-200">
                      <p className="font-semibold text-emerald-800">Tình trạng hoàn tiền:</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
                        Cần hoàn tiền
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Card: Tài khoản ngân hàng nhận tiền hoàn */}
          {req.bankAccount && (
            <section className={`${card} p-6 space-y-3 bg-blue-50/20 border-blue-200/80`}>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏦</span>
                  <h3 className="text-base font-semibold text-ink">
                    Tài khoản nhận tiền hoàn
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Khách cung cấp
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Ngân hàng:</span>
                  <span className="font-semibold text-ink">{req.bankAccount.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-ink text-sm">
                      {req.bankAccount.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(req.bankAccount!.accountNumber)}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-canvas hover:bg-line text-ink transition-colors cursor-pointer border border-line"
                      title="Sao chép số tài khoản"
                    >
                      {copied ? "✓ Đã chép" : "Sao chép"}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Chủ tài khoản:</span>
                  <span className="font-bold text-ink uppercase">
                    {req.bankAccount.accountHolder}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Card: Thông tin khách hàng & Giao hàng */}
          <section className={`${card} p-6 space-y-3`}>
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-semibold text-ink">
                Thông tin khách hàng
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-start gap-2">
                <span className="text-muted">Họ tên:</span>
                <strong className="text-ink text-right">{detail.customer.name}</strong>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-muted">Số điện thoại:</span>
                <strong className="text-ink text-right font-mono">{detail.customer.phone}</strong>
              </div>
              {detail.customer.email && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-muted">Email:</span>
                  <span className="text-ink text-right">{detail.customer.email}</span>
                </div>
              )}
              {detail.shippingAddress && (
                <div className="pt-2.5 border-t border-line space-y-1">
                  <span className="text-muted block">Địa chỉ nhận hàng:</span>
                  <p className="text-ink leading-relaxed font-medium">
                    {[
                      detail.shippingAddress.street,
                      detail.shippingAddress.ward,
                      detail.shippingAddress.district,
                      detail.shippingAddress.province,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Card: Thanh toán */}
          <section className={`${card} p-6 space-y-3`}>
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-semibold text-ink">
                Thông tin thanh toán
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Phương thức:</span>
                <span className="font-semibold text-ink">{detail.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Trạng thái:</span>
                <Badge tone={detail.paymentStatus === "paid" ? "success" : "neutral"}>
                  {detail.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                </Badge>
              </div>
              {isOnlinePaid && (
                <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-xs">
                    <span>⚠️</span> Cần hoàn tiền chuyển khoản
                  </p>
                  <p className="leading-relaxed text-[11px] text-amber-800">
                    Đơn hàng đã thanh toán ONLINE ({formatVND(detail.total)}). Khi duyệt, hệ thống sẽ tự động gắn cờ <strong>Cần hoàn tiền</strong> để bộ phận kế toán thực hiện hoàn tiền.
                  </p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Lightbox Modal phóng to ảnh */}
      {zoomedImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] w-full h-[80vh] flex flex-col items-center justify-center cursor-default"
          >
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 text-white text-sm font-bold px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors cursor-pointer"
            >
              ✕ Đóng
            </button>
            <div className="relative w-full h-full">
              <Image
                src={zoomedImage}
                alt="Phóng to ảnh minh chứng"
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
