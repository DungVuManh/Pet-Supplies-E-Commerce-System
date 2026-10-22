"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateStaffOrderStatus, StaffOrdersApiError } from "../orders/api";
import { orderStatusLabels, type StaffOrderDetail, type StaffEditableOrderStatus } from "../orders/types";
import { card, control, primaryLink, secondaryButton } from "./staff-ui";

export function OrderStatusAction({ order }: { order: StaffOrderDetail }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [selected, setSelected] = useState<StaffEditableOrderStatus | "">("");
  const [carrier, setCarrier] = useState(order.shipping?.carrier || "");
  const [trackingNumber, setTrackingNumber] = useState(order.shipping?.trackingNumber || "");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const locked = useRef(false);
  const options = order.allowedNextStatuses ?? [];
  const nextStatus = options.find((value) => value === selected) || options[0];
  const busy = saving || refreshing;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || busy || needsReload || !nextStatus) return;
    if (!confirming) { setConfirming(true); setNotice(""); setFailure(""); return; }
    locked.current = true; setSaving(true); setFailure(""); setNotice("");
    try {
      await updateStaffOrderStatus(order.id, {
        expectedStatus: order.orderStatus, orderStatus: nextStatus,
        ...(nextStatus === "shipping" ? { shipping: { carrier: carrier.trim(), trackingNumber: trackingNumber.trim() } } : {}),
      });
      setNotice("Cập nhật trạng thái đơn hàng thành công.");
      setConfirming(false);
      startTransition(() => router.refresh());
    } catch (error) {
      if (error instanceof StaffOrdersApiError) {
        if (error.status === 401) { router.replace("/login"); return; }
        if (error.status === 403 && error.code !== "CSRF_INVALID") { router.replace("/forbidden"); return; }
        setFailure(error.message);
        setNeedsReload(error.status === 0 || error.status === 404 || error.status >= 500 || error.code === "ORDER_STATUS_CONFLICT");
      } else {
        setFailure("Chưa xác nhận được kết quả. Hãy tải lại đơn hàng để kiểm tra.");
        setNeedsReload(true);
      }
      setConfirming(false);
    } finally {
      locked.current = false; setSaving(false);
    }
  }

  return <section className={`${card} p-6`} aria-labelledby="order-status-heading">
    <h2 id="order-status-heading" className="text-xl font-semibold">Cập nhật trạng thái</h2>
    {notice && <p role="status" className="mt-4 rounded-lg bg-success-subtle p-4 text-success">{notice}</p>}
    {failure && <p role="alert" className="mt-4 rounded-lg bg-danger-subtle p-4 text-danger">{failure}</p>}
    {needsReload ? <button type="button" className={`${secondaryButton} mt-4`} onClick={() => window.location.reload()}>Tải lại đơn hàng</button>
      : nextStatus ? <form className="mt-4 space-y-4" onSubmit={submit} aria-busy={busy}>
        <fieldset className="min-w-0 space-y-4" disabled={busy || confirming}>
          <label className="grid gap-2 font-medium">Trạng thái tiếp theo
            <select className={`${control} w-full`} value={nextStatus} onChange={(event) => { setSelected(event.target.value as StaffEditableOrderStatus); setFailure(""); setNotice(""); }}>
              {options.map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}
            </select>
          </label>
          {nextStatus === "shipping" && <>
            <label className="grid gap-2 font-medium">Đơn vị vận chuyển (tùy chọn)
              <input className={`${control} w-full`} maxLength={100} value={carrier} onChange={(event) => setCarrier(event.target.value)} />
            </label>
            <label className="grid gap-2 font-medium">Mã vận đơn (tùy chọn)
              <input className={`${control} w-full`} maxLength={100} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
            </label>
          </>}
        </fieldset>
        {confirming && <p role="status" className="rounded-lg bg-canvas p-4">
          Chuyển đơn từ <strong>{orderStatusLabels[order.orderStatus]}</strong> sang <strong>{orderStatusLabels[nextStatus]}</strong>?
        </p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={`${primaryLink} disabled:cursor-not-allowed disabled:opacity-50`}>
            {busy ? "Đang cập nhật…" : confirming ? "Xác nhận cập nhật" : "Cập nhật trạng thái"}
          </button>
          {confirming && <button type="button" disabled={busy} className={secondaryButton} onClick={() => setConfirming(false)}>Quay lại</button>}
        </div>
      </form> : <p className="mt-4 text-sm text-muted">
        {order.orderStatus === "shipping" ? "Đơn đang giao. Bước hoàn thành dành cho khách hàng xác nhận nhận hàng."
          : "Đơn hàng không có bước cập nhật tiếp theo dành cho staff."}
      </p>}
  </section>;
}
