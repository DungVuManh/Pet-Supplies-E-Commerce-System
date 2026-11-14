"use client";

// =============================================================
// features/staff/components/return-decision-panel.tsx
// Giao diện chi tiết yêu cầu hoàn trả & Bảng ra quyết định cho Staff
// =============================================================

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Badge, PageHeader, card, control } from "./staff-ui";
import type { StaffReturnDetail } from "../returns/types";
import { RETURN_REASON_LABELS, RETURN_STATUS_LABELS } from "../returns/types";
import {
 submitStaffReturnDecision,
 receiveStaffReturn,
 StaffReturnApiError,
} from "../returns/api";

type ReturnDecisionPanelProps = {
 detail: StaffReturnDetail;
};

function formatVND(value: number | undefined | null): string {
 const num = typeof value === "number" && !Number.isNaN(value) ? value : 0;
 return num.toLocaleString("vi-VN") + " đ";
}

function formatDateTime(isoString: string | null | undefined): string {
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

 const isPending = req.status === "pending";
 const isOnlinePaid =
  detail.paymentMethod === "ONLINE" && detail.paymentStatus === "paid";

 // Zoom modal state
 const [zoomedImage, setZoomedImage] = useState<string | null>(null);

 // Decision mode: null | "approve_request" | "reject_request" | "receive" | "complete_refund" | "reject_refund"
 const [decisionMode, setDecisionMode] = useState<
  | "approve_request"
  | "reject_request"
  | "receive"
  | "complete_refund"
  | "reject_refund"
  | null
 >(null);
 const [rejectionReason, setRejectionReason] = useState("");
 const [rejectionError, setRejectionError] = useState("");
 const [refundAmount, setRefundAmount] = useState<number>(detail.total || 0);
 const [refundAmountError, setRefundAmountError] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [actionError, setActionError] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);
 const [agreedPrivacy, setAgreedPrivacy] = useState(true);

 function refreshOnConflict(error: unknown) {
  if (error instanceof StaffReturnApiError && error.status === 409) {
   setDecisionMode(null);
   router.refresh();
  }
 }

 const handleCopyAccount = (text: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
   navigator.clipboard.writeText(text);
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
  }
 };

 const handleApproveRequest = async () => {
  try {
   setIsSubmitting(true);
   setActionError(null);
   await submitStaffReturnDecision(detail.id, { action: "approve_request" });
   router.refresh();
   setDecisionMode(null);
  } catch (err) {
   refreshOnConflict(err);
   setActionError(
    err instanceof StaffReturnApiError
     ? err.message
     : "Không thể phê duyệt yêu cầu hoàn trả. Vui lòng thử lại.",
   );
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleRejectRequest = async () => {
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
    action: "reject_request",
    rejectionReason: trimmed,
   });
   router.refresh();
   setDecisionMode(null);
  } catch (err) {
   refreshOnConflict(err);
   setActionError(
    err instanceof StaffReturnApiError
     ? err.message
     : "Không thể từ chối yêu cầu hoàn trả. Vui lòng thử lại.",
   );
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleReceive = async () => {
  try {
   setIsSubmitting(true);
   setActionError(null);
   await receiveStaffReturn(detail.id);
   router.refresh();
   setDecisionMode(null);
  } catch (err) {
   refreshOnConflict(err);
   setActionError(
    err instanceof StaffReturnApiError
     ? err.message
     : "Không thể xác nhận nhận hàng. Vui lòng thử lại.",
   );
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleCompleteRefund = async () => {
  if (
   Number.isNaN(refundAmount) ||
   refundAmount < 0 ||
   refundAmount > detail.total
  ) {
   setRefundAmountError(
    `Số tiền hoàn phải từ 0 đ đến ${formatVND(detail.total)}.`,
   );
   return;
  }
  try {
   setIsSubmitting(true);
   setActionError(null);
   setRefundAmountError("");
   await submitStaffReturnDecision(detail.id, {
    action: "complete_refund",
    refundAmount,
   });
   router.refresh();
   setDecisionMode(null);
  } catch (err) {
   refreshOnConflict(err);
   setActionError(
    err instanceof StaffReturnApiError
     ? err.message
     : "Không thể hoàn tất hoàn trả. Vui lòng thử lại.",
   );
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleRejectRefund = async () => {
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
    action: "reject_refund",
    rejectionReason: trimmed,
   });
   router.refresh();
   setDecisionMode(null);
  } catch (err) {
   refreshOnConflict(err);
   setActionError(
    err instanceof StaffReturnApiError
     ? err.message
     : "Không thể từ chối hoàn tiền. Vui lòng thử lại.",
   );
  } finally {
   setIsSubmitting(false);
  }
 };

 const statusTone =
  req.status === "completed"
   ? "success"
   : req.status === "approved" || req.status === "customer_shipped"
     ? "info"
     : req.status === "cancelled" ? "neutral" : req.status === "rejected"
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
       <h2 className="text-lg font-semibold text-ink">
        Thông tin yêu cầu hoàn trả
       </h2>
       <span className="inline-flex items-center  rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200/60">
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
         Khách hàng không đính kèm hình ảnh minh chứng (Lý do chưa nhận được
         hàng).
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
           SKU: <span className="font-mono">{item.variantSku}</span> · SL:{" "}
           <strong>{item.qty}</strong>
          </p>
          {isPending && (
           <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
            + Hoàn lại {item.qty} vào kho khi duyệt
           </span>
          )}
         </div>
         <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-ink">
           {formatVND(item.totalPrice ?? item.unitPrice * item.qty)}
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
       <dd className="text-right font-medium">
        {formatVND(detail.shippingFee)}
       </dd>
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
       <h3 className="text-base font-semibold text-ink">Quyết định xử lý</h3>
      </div>

      {req.status === "pending" ? (
       decisionMode === null ? (
        <div className="space-y-4">
         <p className="text-xs text-muted leading-relaxed">
          Vui lòng đối chiếu hình ảnh minh chứng và thông tin đơn hàng trước khi
          phê duyệt yêu cầu bước đầu.
         </p>
         <div className="flex flex-col gap-2.5">
          <button
           type="button"
           onClick={() => setDecisionMode("approve_request")}
           className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
           Chấp nhận yêu cầu
          </button>
          <button
           type="button"
           onClick={() => setDecisionMode("reject_request")}
           className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
          >
           Từ chối yêu cầu
          </button>
         </div>
        </div>
       ) : decisionMode === "approve_request" ? (
        /* Xác nhận chấp nhận */
        <div className="space-y-3.5 rounded-xl bg-emerald-50/70 p-4 border border-emerald-200/80">
         <h4 className="text-sm font-bold text-emerald-900">
          Xác nhận chấp nhận yêu cầu hoàn trả?
         </h4>
         <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
          <li>
           Khách hàng sẽ nhận hướng dẫn gửi bưu kiện trả về trong 3 ngày.
          </li>
          <li>Kho sản phẩm chưa bị thay đổi ở bước này.</li>
         </ul>
         <div className="flex items-center gap-2 pt-2">
          <button
           type="button"
           onClick={handleApproveRequest}
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
          <label
           htmlFor="rejectionReason"
           className="block text-xs font-semibold text-rose-800 mb-1.5"
          >
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
            <p className="text-[11px] text-rose-600 font-medium">
             {rejectionError}
            </p>
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
           onClick={handleRejectRequest}
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
      ) : req.status === "approved" ? (
       <div className="space-y-3 text-xs">
        <div className="p-4 rounded-xl border bg-blue-50/80 border-blue-200 text-blue-900 space-y-2">
         <p className="font-bold text-sm">
          ✓ Đã duyệt yêu cầu · Chờ khách gửi hàng
         </p>
         <p className="text-[11px] text-blue-700">
          Người duyệt: <strong>{req.reviewedByName || "Nhân viên"}</strong> ·
          Lúc: {formatDateTime(req.approvedAt || req.reviewedAt)}
         </p>
         <p className="text-xs text-blue-800 leading-relaxed pt-1">
          Khách hàng có thời hạn tối đa 3 ngày để đóng gói và gửi hàng về địa
          chỉ của shop. Sau khi khách bấm xác nhận đã gửi, hệ thống sẽ chuyển
          sang trạng thái <strong>Đã gửi hàng</strong>.
         </p>
        </div>
       </div>
      ) : req.status === "customer_shipped" ? (
       <div className="space-y-4">
        <div className="p-4 rounded-xl border bg-indigo-50/80 border-indigo-200 text-indigo-900 space-y-2">
         <p className="font-bold text-sm">📦 Khách đã xác nhận gửi trả hàng</p>
         <p className="text-[11px] text-indigo-700">
          Khách xác nhận lúc:{" "}
          <strong>{formatDateTime(req.customerShippedAt)}</strong>
         </p>
         <p className="text-xs text-indigo-800 leading-relaxed pt-1">
          Kiện hàng đang được chuyển về cửa hàng. Khi nhân viên nhận được bưu
          kiện thực tế, bấm <strong>Đã nhận được hàng</strong> bên dưới.
         </p>
        </div>

        {decisionMode === null ? (
         <button
          type="button"
          onClick={() => setDecisionMode("receive")}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
         >
          Đã nhận được hàng
         </button>
        ) : (
         <div className="space-y-3 rounded-xl bg-blue-50/90 p-4 border border-blue-200">
          <h4 className="text-sm font-bold text-blue-900">
           Xác nhận cửa hàng đã nhận được kiện hàng?
          </h4>
          <p className="text-xs text-blue-800">
           Sau khi xác nhận, đơn hàng sẽ chuyển sang bước nhân viên mở kiện kiểm
           tra chất lượng sản phẩm.
          </p>
          <div className="flex items-center gap-2 pt-1">
           <button
            type="button"
            onClick={handleReceive}
            disabled={isSubmitting}
            className="flex-1 inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
           >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận đã nhận"}
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
        )}
       </div>
      ) : req.status === "received" ? (
       <div className="space-y-4">
        <div className="p-4 rounded-xl border bg-amber-50/80 border-amber-200 text-amber-900 space-y-2">
         <p className="font-bold text-sm">
          🔍 Đã nhận hàng · Nhân viên kiểm tra
         </p>
         <p className="text-[11px] text-amber-700">
          Nhận hàng lúc: <strong>{formatDateTime(req.receivedAt)}</strong>
         </p>
         <p className="text-xs text-amber-800 leading-relaxed pt-1">
          Nhân viên hãy kiểm tra tình trạng hàng thực tế, thực hiện chuyển tiền
          hoàn ngoài qua ứng dụng ngân hàng theo STK của khách, sau đó nhập số
          tiền hoàn và bấm hoàn tất.
         </p>
        </div>

        {/* Form nhập refundAmount */}
        <div className="space-y-1.5">
         <label
          htmlFor="refundAmountInput"
          className="block text-xs font-semibold text-ink"
         >
          Số tiền hoàn lại (VND) *
         </label>
         <input
          id="refundAmountInput"
          type="number"
          min={0}
          max={detail.total}
          value={refundAmount}
          onChange={(e) => {
           setRefundAmount(Number(e.target.value));
           setRefundAmountError("");
          }}
          className={`${control} w-full text-sm font-bold text-ink`}
         />
         <div className="flex justify-between items-center text-[11px] text-muted">
          <span>Tổng đơn: {formatVND(detail.total)}</span>
          {refundAmountError && (
           <span className="text-rose-600 font-semibold">
            {refundAmountError}
           </span>
          )}
         </div>
        </div>

        {decisionMode === null ? (
         <div className="flex flex-col gap-2.5 pt-1">
          <button
           type="button"
           onClick={() => setDecisionMode("complete_refund")}
           className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
           Xác nhận hoàn tiền & Hoàn tất
          </button>
          <button
           type="button"
           onClick={() => setDecisionMode("reject_refund")}
           className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
          >
           Từ chối hoàn tiền
          </button>
         </div>
        ) : decisionMode === "complete_refund" ? (
         <div className="space-y-3.5 rounded-xl bg-emerald-50/80 p-4 border border-emerald-200">
          <h4 className="text-sm font-bold text-emerald-900">
           Xác nhận hoàn tất hoàn trả & hoàn tiền?
          </h4>
          <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
           <li>
            Đã chuyển khoản ngoài: <strong>{formatVND(refundAmount)}</strong>.
           </li>
           <li>
            Đơn hàng sẽ chuyển sang trạng thái <strong>Đã hoàn trả</strong>.
           </li>
           <li>Sản phẩm trong đơn sẽ tự động được hoàn kho.</li>
          </ul>
          <div className="flex items-center gap-2 pt-2">
           <button
            type="button"
            onClick={handleCompleteRefund}
            disabled={isSubmitting}
            className="flex-1 inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
           >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận hoàn tất"}
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
         <div className="space-y-3.5 rounded-xl bg-rose-50/80 p-4 border border-rose-200">
          <h4 className="text-sm font-bold text-rose-900">Từ chối hoàn tiền</h4>
          <div>
           <label
            htmlFor="rejectionRefundReason"
            className="block text-xs font-semibold text-rose-800 mb-1.5"
           >
            Lý do từ chối (bắt buộc 5–500 ký tự) *
           </label>
           <textarea
            id="rejectionRefundReason"
            rows={3}
            value={rejectionReason}
            onChange={(e) => {
             setRejectionReason(e.target.value);
             setRejectionError("");
            }}
            placeholder="Nhập lý do hàng hóa không hợp lệ sau khi kiểm tra..."
            className="w-full rounded-lg border border-rose-300 p-2.5 text-xs text-ink placeholder:text-muted bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
           />
           <div className="flex justify-between items-center mt-1.5">
            {rejectionError ? (
             <p className="text-[11px] text-rose-600 font-medium">
              {rejectionError}
             </p>
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
            onClick={handleRejectRefund}
            disabled={isSubmitting}
            className="flex-1 inline-flex min-h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
           >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận từ chối hoàn tiền"}
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
        )}
       </div>
      ) : req.status === "cancelled" ? (
       <div className="rounded-lg border border-line bg-canvas p-4 text-sm text-ink">
        <p className="font-semibold">Khách đã hủy yêu cầu</p>
        <p className="mt-2 text-muted">{formatDateTime(req.cancelledAt)}</p>
       </div>
      ) : req.status === "completed" ? (
       <div className="space-y-3 text-xs">
        <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 space-y-2">
         <p className="font-bold text-sm">✓ Hoàn tất hoàn trả thành công</p>
         <p className="text-[11px] text-emerald-700">
          Người duyệt: <strong>{req.reviewedByName || "Nhân viên"}</strong> ·
          Lúc: {formatDateTime(req.completedAt || req.reviewedAt)}
         </p>
         {typeof req.refundAmount === "number" && (
          <div className="pt-2 border-t border-emerald-200 flex justify-between items-center font-semibold">
           <span>Số tiền hoàn thực tế:</span>
           <span className="text-emerald-800 text-sm font-bold">
            {formatVND(req.refundAmount)}
           </span>
          </div>
         )}
         <p className="text-[11px] text-emerald-700 pt-1">
          Đơn hàng đã được chuyển sang Đã hoàn trả và tự động hoàn kho sản phẩm
          thành công.
         </p>
        </div>
       </div>
      ) : (
       /* Đã từ chối (req.status === "rejected") */
       <div className="space-y-3 text-xs">
        <div className="p-4 rounded-xl border bg-rose-50 border-rose-200 text-rose-900 space-y-2">
         <p className="font-bold text-sm">✕ Đã từ chối yêu cầu hoàn trả</p>
         <p className="text-[11px] text-muted">
          Người duyệt: <strong>{req.reviewedByName || "Nhân viên"}</strong> ·
          Lúc: {formatDateTime(req.reviewedAt)}
         </p>
         {req.rejectionReason && (
          <div className="pt-2 border-t border-rose-200">
           <p className="font-semibold text-rose-800">Lý do từ chối:</p>
           <p className="mt-1 text-ink leading-relaxed">
            {req.rejectionReason}
           </p>
          </div>
         )}
        </div>
       </div>
      )}
     </section>

     {/* Card: Tài khoản ngân hàng nhận tiền hoàn */}
     {req.bankAccount && (
      <section
       className={`${card} p-6 space-y-3 bg-blue-50/20 border-blue-200/80`}
      >
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
         <span className="font-semibold text-ink">
          {req.bankAccount.bankName}
         </span>
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

       {/* Cam kết / Đồng ý chia sẻ dữ liệu cá nhân theo Luật số 91/2025/QH15 */}
       <div className="pt-3 border-t border-blue-200/60 mt-1">
        <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer select-none">
         <input
          type="checkbox"
          checked={agreedPrivacy}
          onChange={(e) => setAgreedPrivacy(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand accent-brand cursor-pointer"
         />
         <span className="leading-relaxed">
          Tôi đồng ý chia sẻ dữ liệu cá nhân với cửa hàng theo{" "}
          <Link
           href="/policy/dieu-khoan-bao-ve-du-lieu-ca-nhan"
           target="_blank"
           className="text-brand font-semibold underline hover:text-brand-hover inline-flex items-center gap-0.5"
          >
           Điều khoản bảo vệ dữ liệu cá nhân
          </Link>{" "}
          (Luật số 91/2025/QH15).
         </span>
        </label>
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
        <strong className="text-ink text-right font-mono">
         {detail.customer.phone}
        </strong>
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
       {isOnlinePaid && (req.refundStatus === "refunded" || req.refundStatus === "pending_refund" || req.status === "received") &&
        (req.refundStatus === "refunded" ? (
         <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-xs">
           <span>✓</span> Đã hoàn tiền chuyển khoản
          </p>
          <p className="leading-relaxed text-[11px] text-emerald-800">
           Đã hoàn tất chuyển khoản số tiền{" "}
           <strong>{formatVND(req.refundAmount ?? detail.total)}</strong> cho
           khách hàng.
          </p>
         </div>
        ) : (
         <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-xs">
           <span>⚠️</span> Cần hoàn tiền chuyển khoản
          </p>
          <p className="leading-relaxed text-[11px] text-amber-800">
           Đơn hàng đã thanh toán ONLINE ({formatVND(detail.total)}). Nhân viên
           chuyển khoản thủ công cho khách, sau đó bấm{" "}
           <strong>Xác nhận hoàn tiền & Hoàn tất</strong>.
          </p>
         </div>
        ))}
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
