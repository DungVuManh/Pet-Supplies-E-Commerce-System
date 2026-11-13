"use client";

import { useId } from "react";
import Image from "next/image";
import { useReturnHistory } from "../hooks/use-return-history";

const statusLabels = {
  pending: "Chờ duyệt", approved: "Chờ gửi hàng", customer_shipped: "Đã gửi hàng",
  received: "Đang kiểm tra", completed: "Hoàn tất", rejected: "Đã từ chối", cancelled: "Đã hủy",
};
const reasons = {
  damaged_or_missing: "Hàng có vấn đề hoặc thiếu hàng", damaged_or_defective: "Hàng có vấn đề",
  not_received: "Chưa nhận được hàng", missing_items: "Thiếu hàng",
};
const control = "min-h-11 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-canvas disabled:opacity-50";

export function ReturnHistory({ orderId, version }: { orderId: string; version: string }) {
  const { page, setPage, selection, setSelection, history, detail, retry } = useReturnHistory(orderId, version);
  const titleId = useId();
  const panelId = useId();
  const error = history?.error || detail?.error;
  const entry = detail?.data;

  return (
    <section aria-labelledby={titleId} className="mt-6 space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-6">
      <h2 id={titleId} className="text-xl font-semibold">Lịch sử hoàn đơn</h2>
      {error && <div className="space-y-2"><p role="alert" className="text-danger">{error}</p><button type="button" onClick={retry} className={control}>Thử lại</button></div>}
      {!history && <p role="status" className="text-muted">Đang tải lịch sử…</p>}
      {history?.data?.items.length === 0 && <p className="text-muted">Chưa có yêu cầu hoàn đơn.</p>}
      {history?.data && (
        <>
          <ul className="divide-y divide-line">
            {history.data.items.map((item) => (
              <li key={item.requestId} className="py-2">
                <button type="button" aria-expanded={item.requestId === selection} aria-controls={item.requestId === selection ? panelId : undefined} className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 rounded-lg p-2 text-left hover:bg-canvas" onClick={() => setSelection(item.requestId === selection ? null : item.requestId)}>
                  <span><span className="block font-semibold">{reasons[item.reason]}</span><time className="text-sm text-muted" dateTime={item.requestedAt}>{new Date(item.requestedAt).toLocaleString("vi-VN")}</time></span>
                  <span className="rounded-full bg-brand-subtle px-3 py-1 text-sm font-semibold text-brand">{statusLabels[item.status]}</span>
                </button>
                {item.requestId === selection && (
                  <div id={panelId} className="space-y-3 px-2 py-4">
                    {!detail && <p role="status" className="text-muted">Đang tải chi tiết…</p>}
                    {entry && (
                      <>
                        <p className="break-words whitespace-pre-wrap">{entry.description}</p>
                        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr]">
                          {([
                            ["Đã duyệt", entry.approvedAt], ["Đã gửi hàng", entry.customerShippedAt],
                            ["Đã nhận hàng hoàn", entry.receivedAt], ["Hoàn tất", entry.completedAt],
                            ["Đã hủy", entry.cancelledAt],
                            ["Đã từ chối", entry.status === "rejected" ? entry.reviewedAt : null],
                          ] as const).filter(([, date]) => date).map(([label, date]) => (
                            <div key={label} className="contents"><dt className="font-medium">{label}</dt><dd>{new Date(date!).toLocaleString("vi-VN")}</dd></div>
                          ))}
                          {entry.rejectionReason && <div className="contents"><dt className="font-medium">Lý do từ chối</dt><dd>{entry.rejectionReason}</dd></div>}
                          {entry.bankAccount && <div className="contents"><dt className="font-medium">Tài khoản nhận hoàn</dt><dd className="break-words">{entry.bankAccount.bankName} · {entry.bankAccount.accountNumber} · {entry.bankAccount.accountHolder}</dd></div>}
                        </dl>
                        {entry.images.length > 0 && (
                          <ul className="flex flex-wrap gap-2" aria-label="Ảnh minh chứng">
                            {entry.images.map((url, index) => (
                              <li key={index}><a href={url} target="_blank" rel="noreferrer" className="block rounded-lg"><Image src={url} alt={`Xem ảnh minh chứng ${index + 1}`} width={88} height={88} className="size-22 rounded-lg border border-line object-cover" unoptimized /></a></li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {history.data.pagination.totalPages > 1 && <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={control} disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button>
            <span>Trang {page} / {history.data.pagination.totalPages}</span>
            <button type="button" className={control} disabled={page >= history.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Trang sau</button>
          </div>}
        </>
      )}
    </section>
  );
}
