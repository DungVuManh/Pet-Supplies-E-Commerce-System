"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordStaffOrderInvoiceExport } from "@/features/staff/orders/api";

export function InvoiceActions({
  orderId,
  orderCode,
  initialExportCount,
}: {
  orderId: string;
  orderCode: string;
  initialExportCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [exportCount, setExportCount] = useState(initialExportCount);
  const [notice, setNotice] = useState("");

  async function handlePrintOrSavePdf() {
    setBusy(true);
    setNotice("");
    try {
      await recordStaffOrderInvoiceExport(orderId);
      setExportCount((count) => count + 1);
    } catch {
      setNotice(
        "Chưa thể ghi lịch sử xuất lên máy chủ, bạn vẫn có thể tiếp tục in hoặc lưu PDF."
      );
    } finally {
      setBusy(false);
      window.print();
    }
  }

  return (
    <div className="mx-auto mb-6 w-full max-w-[794px] space-y-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/staff/orders/${encodeURIComponent(orderId)}`}
            className="inline-flex min-h-10 items-center gap-2 font-medium text-brand hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Quay lại đơn #{orderCode}</span>
          </Link>
          {exportCount > 0 && (
            <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted tabular-nums">
              Đã xuất {exportCount} lần
            </span>
          )}
        </div>

        <Button
          type="button"
          onClick={() => void handlePrintOrSavePdf()}
          disabled={busy}
          className="w-full gap-2 sm:w-auto"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span>{busy ? "Đang chuẩn bị…" : "In hóa đơn / Lưu PDF"}</span>
        </Button>
      </div>

      <p className="text-xs text-muted">
        Mẹo: Trong hộp thoại in của trình duyệt, chọn đích đến “Lưu dưới dạng PDF” (Save as PDF) và khổ giấy A4 hoặc A5 để lưu tệp hóa đơn.
      </p>

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-2.5 text-xs font-medium text-warning"
        >
          {notice}
        </p>
      )}
    </div>
  );
}

