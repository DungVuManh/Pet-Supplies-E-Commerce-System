"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateStaffOrderStatus, StaffOrdersApiError } from "../orders/api";
import {
 orderStatusLabels,
 type StaffOrderDetail,
 type StaffEditableOrderStatus,
} from "../orders/types";
import { card, control, primaryLink, secondaryButton } from "./staff-ui";

const CANCELLATION_REASONS = [
 "Hết hàng / Tồn kho không đủ",
 "Không thể giao tới địa chỉ người mua",
 "Người mua yêu cầu hủy",
 "Không liên lạc được với người mua",
 "other",
] as const;

const REASON_LABELS: Record<string, string> = {
 "Hết hàng / Tồn kho không đủ": "Hết hàng / Tồn kho không đủ",
 "Không thể giao tới địa chỉ người mua": "Không thể giao tới địa chỉ người mua",
 "Người mua yêu cầu hủy": "Người mua yêu cầu hủy",
 "Không liên lạc được với người mua": "Không liên lạc được với người mua",
 other: "Khác (tự nhập lý do)",
};

export function OrderStatusAction({ order }: { order: StaffOrderDetail }) {
 const router = useRouter();
 const [refreshing, startTransition] = useTransition();
 const [selected, setSelected] = useState<StaffEditableOrderStatus | "">("");
 const [confirming, setConfirming] = useState(false);
 const [saving, setSaving] = useState(false);
 const [failure, setFailure] = useState("");
 const [notice, setNotice] = useState("");
 const [needsReload, setNeedsReload] = useState(false);

 const [cancelReasonType, setCancelReasonType] = useState<string>(CANCELLATION_REASONS[0]);
 const [customCancelReason, setCustomCancelReason] = useState("");
 const [cancellationNote, setCancellationNote] = useState("");

 const locked = useRef(false);
 const options = order.allowedNextStatuses ?? [];
 const nextStatus = options.find((value) => value === selected) || options[0];
 const busy = saving || refreshing;

 const isCancelling = nextStatus === "cancelled";

 async function submit(event: FormEvent) {
  event.preventDefault();
  if (locked.current || busy || needsReload || !nextStatus) return;

  let finalReason = "";
  if (isCancelling) {
   if (cancelReasonType === "other") {
    finalReason = customCancelReason.trim();
    if (!finalReason) {
     setFailure("Vui lòng nhập lý do hủy đơn hàng.");
     return;
    }
    if (finalReason.length < 5) {
     setFailure("Lý do hủy đơn phải có ít nhất 5 ký tự.");
     return;
    }
   } else {
    finalReason = cancelReasonType;
   }
  }

  if (!confirming) {
   setConfirming(true);
   setNotice("");
   setFailure("");
   return;
  }
  locked.current = true;
  setSaving(true);
  setFailure("");
  setNotice("");
  try {
   const payload: Parameters<typeof updateStaffOrderStatus>[1] = {
    expectedStatus: order.orderStatus,
    orderStatus: nextStatus,
   };
   if (isCancelling) {
    payload.cancellationReason = finalReason;
    if (cancellationNote.trim()) {
     payload.cancellationNote = cancellationNote.trim();
    }
   }
   await updateStaffOrderStatus(order.id, payload);
   setNotice("Cập nhật trạng thái đơn hàng thành công.");
   setConfirming(false);
   startTransition(() => router.refresh());
  } catch (error) {
   if (error instanceof StaffOrdersApiError) {
    if (error.status === 401) {
     router.replace("/login");
     return;
    }
    if (error.status === 403 && error.code !== "CSRF_INVALID") {
     router.replace("/forbidden");
     return;
    }
    setFailure(error.message);
    setNeedsReload(
     error.status === 0 ||
      error.status === 404 ||
      error.status >= 500 ||
      error.code === "ORDER_STATUS_CONFLICT",
    );
   } else {
    setFailure("Chưa xác nhận được kết quả. Hãy tải lại đơn hàng để kiểm tra.");
    setNeedsReload(true);
   }
   setConfirming(false);
  } finally {
   locked.current = false;
   setSaving(false);
  }
 }

 return (
  <section className={`${card} p-6`} aria-labelledby="order-status-heading">
   <h2 id="order-status-heading" className="text-xl font-semibold">
    Cập nhật trạng thái
   </h2>
   {notice && (
    <p
     role="status"
     className="mt-4 rounded-lg bg-success-subtle p-4 text-success"
    >
     {notice}
    </p>
   )}
   {failure && (
    <p
     role="alert"
     className="mt-4 rounded-lg bg-danger-subtle p-4 text-danger"
    >
     {failure}
    </p>
   )}
   {needsReload ? (
    <button
     type="button"
     className={`${secondaryButton} mt-4`}
     onClick={() => window.location.reload()}
    >
     Tải lại đơn hàng
    </button>
   ) : nextStatus ? (
    <form className="mt-4 space-y-4" onSubmit={submit} aria-busy={busy}>
     <fieldset className="min-w-0 space-y-4" disabled={busy || confirming}>
      <label className="grid gap-2 font-medium">
       Trạng thái tiếp theo
       <select
        className={`${control} w-full`}
        value={nextStatus}
        onChange={(event) => {
         setSelected(event.target.value as StaffEditableOrderStatus);
         setFailure("");
         setNotice("");
         setConfirming(false);
        }}
       >
        {options.map((status) => (
         <option key={status} value={status}>
          {orderStatusLabels[status]}
         </option>
        ))}
       </select>
      </label>

      {isCancelling && (
       <div className="space-y-3 rounded-lg border border-danger/30 bg-danger-subtle/40 p-4">
        <p className="font-semibold text-danger">Lý do hủy đơn hàng *</p>
        <label className="grid gap-1 text-sm font-medium">
         Chọn lý do hủy
         <select
          className={`${control} w-full bg-surface`}
          value={cancelReasonType}
          onChange={(e) => {
           setCancelReasonType(e.target.value);
           setFailure("");
          }}
         >
          {CANCELLATION_REASONS.map((r) => (
           <option key={r} value={r}>
            {REASON_LABELS[r]}
           </option>
          ))}
         </select>
        </label>

        {cancelReasonType === "other" && (
         <label className="grid gap-1 text-sm font-medium">
          Lý do cụ thể (tự viết) *
          <textarea
           rows={2}
           className={`${control} w-full bg-surface`}
           placeholder="Nhập lý do hủy chi tiết (tối thiểu 5 ký tự)..."
           value={customCancelReason}
           onChange={(e) => {
            setCustomCancelReason(e.target.value);
            setFailure("");
           }}
          />
         </label>
        )}

        <label className="grid gap-1 text-sm font-medium">
         Ghi chú thêm (tùy chọn)
         <textarea
          rows={2}
          className={`${control} w-full bg-surface`}
          placeholder="Ghi chú nội bộ hoặc lưu ý xử lý..."
          value={cancellationNote}
          onChange={(e) => setCancellationNote(e.target.value)}
         />
        </label>
       </div>
      )}
     </fieldset>
     {confirming && (
      <div role="status" className={`rounded-lg p-4 ${isCancelling ? "bg-danger-subtle text-danger" : "bg-canvas"}`}>
       <p>
        Chuyển đơn từ <strong>{orderStatusLabels[order.orderStatus]}</strong>{" "}
        sang <strong>{orderStatusLabels[nextStatus]}</strong>?
       </p>
       {isCancelling && (
        <p className="mt-2 text-sm">
         Lý do: <strong>{cancelReasonType === "other" ? customCancelReason : REASON_LABELS[cancelReasonType]}</strong>
        </p>
       )}
      </div>
     )}
     <div className="flex flex-wrap gap-3">
      <button
       type="submit"
       disabled={busy}
       className={
        isCancelling
         ? "inline-flex items-center justify-center rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
         : `${primaryLink} disabled:cursor-not-allowed disabled:opacity-50`
       }
      >
       {busy
        ? "Đang cập nhật…"
        : confirming
          ? isCancelling
            ? "Xác nhận hủy đơn hàng"
            : "Xác nhận cập nhật"
          : isCancelling
            ? "Hủy đơn hàng"
            : "Cập nhật trạng thái"}
      </button>
      {confirming && (
       <button
        type="button"
        disabled={busy}
        className={secondaryButton}
        onClick={() => setConfirming(false)}
       >
        Quay lại
       </button>
      )}
     </div>
    </form>
   ) : (
    <p className="mt-4 text-sm text-muted">
     Đơn hàng không có bước cập nhật tiếp theo dành cho staff.
    </p>
   )}
  </section>
 );
}
