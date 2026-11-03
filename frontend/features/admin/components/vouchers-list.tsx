"use client";

import Link from "next/link";
import { CircleX, TicketPercent } from "lucide-react";
import { Field, ListState, Pagination, TabNav, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDate, formatVnd } from "@/lib/format";
import { useVouchersList } from "../hooks/use-vouchers-list";
import { voucherStateLabels } from "../status";
import type { VoucherFilter } from "../types";
import { voucherUsageText, voucherValueText } from "../voucher";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";

const tabs: { value: VoucherFilter["tab"]; label: string }[] = [
  { value: "all", label: "Tất cả" }, { value: "active", label: "Đang chạy" }, { value: "scheduled", label: "Sắp diễn ra" },
  { value: "ended", label: "Đã kết thúc" }, { value: "disabled", label: "Đã tắt" },
];
const rowAction = "inline-flex min-h-10 items-center font-semibold hover:underline disabled:opacity-60";
const dayOf = (date: string) => formatDate(`${date}T00:00:00+07:00`);

export function VouchersList() {
  const { filter, draft, setDraft, apply, reset, reload, items, counts, state, error, page, setPage, pagination, from, to, confirming, pending, actionError, notice, enable, confirm, ask, cancel } = useVouchersList();
  const deleting = confirming?.kind === "delete";

  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); apply({ ...draft, tab: filter.tab }); }

  return <>
    <TabNav label="Lọc theo trạng thái" items={tabs.map((tab) => ({ label: `${tab.label} (${(counts?.[tab.value] ?? 0).toLocaleString("vi-VN")})`, active: filter.tab === tab.value, onSelect: () => apply({ ...filter, tab: tab.value }) }))} />

    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_auto]" aria-label="Tìm voucher">
      <Field label="Tìm kiếm" htmlFor="voucher-query"><input id="voucher-query" type="search" className={control} placeholder="Mã hoặc tên voucher" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} /></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Tìm kiếm</button>
    </form>

    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <DataTable caption="Danh sách voucher"
      head={<><Th>Mã / Tên</Th><Th>Giá trị</Th><Th>Hiệu lực</Th><Th>Lượt dùng</Th><Th className="whitespace-nowrap">Đã giảm</Th><Th>Trạng thái</Th><Th>Thao tác</Th></>}
      footer={state ? undefined : <Pagination from={from} to={to} total={pagination.total} page={page} pages={pagination.totalPages} onPage={setPage} />}>
      {state ? <tr><td colSpan={7} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<TicketPercent className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy voucher"
          description="Không có voucher khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ voucher."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reset}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải danh sách voucher..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải danh sách voucher"
          description={error?.message ?? "Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."}
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reload}>Thử lại</button>} />}
      </td></tr> : items.map((voucher) => <tr key={voucher.code}>
        <Td><Stack primary={voucher.code} secondary={voucher.name || "Chưa đặt tên"} strong /></Td>
        <Td><Stack primary={voucherValueText(voucher)} secondary={voucher.minOrderAmount ? <span className="whitespace-nowrap">Đơn từ {formatVnd(voucher.minOrderAmount)}</span> : undefined} /></Td>
        <Td className="whitespace-nowrap"><Stack primary={dayOf(voucher.startDate)} secondary={`đến ${dayOf(voucher.endDate)}`} /></Td>
        <Td className="whitespace-nowrap tabular-nums">{voucherUsageText(voucher.usedCount, voucher.usageLimit)}</Td>
        <Td className="whitespace-nowrap font-semibold tabular-nums">{formatVnd(voucher.discountGiven)}</Td>
        <Td><StatusBadge status={voucherStateLabels[voucher.state]} /></Td>
        <Td><div className="flex gap-x-4 whitespace-nowrap">
          <Link href={`/admin/vouchers/${encodeURIComponent(voucher.code)}/edit`} aria-label={`Sửa ${voucher.code}`} className={`${rowAction} text-brand`}>Sửa</Link>
          {voucher.state === "disabled"
            ? <button type="button" disabled={pending} aria-label={`Bật ${voucher.code}`} className={`${rowAction} text-brand`} onClick={() => enable(voucher)}>Bật</button>
            : <button type="button" disabled={pending} aria-label={`Tắt ${voucher.code}`} className={rowAction} onClick={() => ask("disable", voucher)}>Tắt</button>}
          <button type="button" disabled={pending} aria-label={`Xóa ${voucher.code}`} className={`${rowAction} text-danger`} onClick={() => ask("delete", voucher)}>Xóa</button>
        </div></Td>
      </tr>)}
    </DataTable>

    <AdminConfirmDialog open={Boolean(confirming)} danger={deleting} pending={pending} error={actionError} onConfirm={confirm} onClose={cancel}
      title={deleting ? "Xóa voucher?" : "Tắt voucher?"} confirmLabel={deleting ? "Xóa voucher" : "Tắt voucher"}
      description={confirming ? (deleting
        ? `“${confirming.voucher.code}” sẽ bị xóa vĩnh viễn. Voucher đã có đơn hàng sử dụng sẽ không thể xóa.`
        : `Khách hàng sẽ không dùng được “${confirming.voucher.code}” từ bây giờ. Các đơn đã đặt vẫn giữ nguyên mức giảm.`) : ""} />
  </>;
}
