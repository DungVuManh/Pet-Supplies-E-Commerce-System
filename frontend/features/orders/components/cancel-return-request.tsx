"use client";

import { useId, useRef } from "react";
import { useCancelOrderReturn } from "../hooks/use-cancel-order-return";

export function CancelReturnRequest({ orderId, requestId, onChange }: {
  orderId: string;
  requestId: string;
  onChange?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { busy, error, cancel, clearError } = useCancelOrderReturn(orderId, requestId, onChange);

  return (
    <>
      <button type="button" disabled={busy} className="min-h-11 w-full rounded-lg border border-danger px-4 text-sm font-semibold text-danger hover:bg-danger-subtle" onClick={() => {
        clearError();
        dialog.current?.showModal();
      }}>
        Hủy yêu cầu hoàn đơn
      </button>
      <dialog ref={dialog} aria-labelledby={titleId} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-black/40">
        <h3 id={titleId} className="text-xl font-semibold">Hủy yêu cầu hoàn đơn?</h3>
        <p className="mt-2 text-sm text-muted">Yêu cầu sẽ dừng xử lý. Bạn có thể gửi yêu cầu mới nếu đơn vẫn đủ điều kiện hoàn trả.</p>
        {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-canvas" onClick={() => dialog.current?.close()}>
            Quay lại
          </button>
          <button type="button" disabled={busy} className="min-h-11 rounded-lg bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60" onClick={async () => {
            if (await cancel()) dialog.current?.close();
          }}>
            {busy ? "Đang hủy…" : "Xác nhận hủy"}
          </button>
        </div>
      </dialog>
    </>
  );
}
