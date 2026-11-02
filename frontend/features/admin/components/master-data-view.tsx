"use client";

import { CircleX, Package, Plus } from "lucide-react";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { Field, ListState, Pagination, TabNav, card, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDate, formatVnd } from "@/lib/format";
import { useMasterData } from "../hooks/use-master-data";
import { masterDataStatusLabels } from "../status";
import type { MasterDataKind, MasterDataStatus } from "../types";
import { AdminPageHeader, DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";

type Tab = { kind: MasterDataKind; label: string; add: string; search: string; codeHeader: string; nameHeader: string; metricHeader: string; metric: (value: number | string) => string };

const countOf = (noun: string) => (value: number | string) => `${Number(value).toLocaleString("vi-VN")} ${noun}`;

const tabs: Tab[] = [
  { kind: "petType", label: "Loài thú cưng", add: "Thêm loài", search: "Tên hoặc mã loài", codeHeader: "Mã loài", nameHeader: "Loài thú cưng / Mô tả", metricHeader: "Số giống", metric: countOf("giống") },
  { kind: "breed", label: "Giống", add: "Thêm giống", search: "Tên hoặc mã giống", codeHeader: "Mã giống", nameHeader: "Giống / Mô tả", metricHeader: "Loài", metric: String },
  { kind: "brand", label: "Thương hiệu", add: "Thêm thương hiệu", search: "Tên hoặc mã thương hiệu", codeHeader: "Mã thương hiệu", nameHeader: "Thương hiệu / Xuất xứ", metricHeader: "Sản phẩm", metric: countOf("sản phẩm") },
  { kind: "unit", label: "Đơn vị", add: "Thêm đơn vị", search: "Tên hoặc mã đơn vị", codeHeader: "Mã đơn vị", nameHeader: "Đơn vị / Cách dùng", metricHeader: "Sản phẩm", metric: countOf("sản phẩm") },
  { kind: "shippingMethod", label: "Vận chuyển", add: "Thêm phương thức", search: "Tên hoặc mã phương thức", codeHeader: "Mã phương thức", nameHeader: "Phương thức / Mô tả", metricHeader: "Phí", metric: (value) => formatVnd(Number(value)) },
];

export function MasterDataView() {
  const { kind, draft, setDraft, submit, items, counts, state, error, reload, page, setPage, pagination, from, to, notice, setNotice, selectKind, clearFilters } = useMasterData();
  const tab = tabs.find((item) => item.kind === kind) ?? tabs[0];
  const count = (value: MasterDataKind) => (counts?.[value] ?? 0).toLocaleString("vi-VN");

  return <>
    <AdminPageHeader breadcrumbs={["Dữ liệu nền", "Dữ liệu nền"]} title="Dữ liệu nền" subtitle="Chuẩn hóa dữ liệu dùng chung cho sản phẩm và vận hành."
      actions={<DemoNotice key={kind} variant="primary" label={tab.add} icon={<Plus className="h-4 w-4" aria-hidden="true" />}
        message={`“${tab.add}” chưa có màn hình thiết kế và chưa kết nối backend.`} />} />

    <TabNav label="Loại dữ liệu nền" items={tabs.map((item) => ({ label: `${item.label} (${count(item.kind)})`, active: item.kind === kind, onSelect: () => selectKind(item.kind) }))} />

    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,360px)_232px_auto] md:justify-start" aria-label={`Bộ lọc ${tab.label.toLowerCase()}`}>
      <Field label="Tìm kiếm" htmlFor="master-query"><input id="master-query" type="search" className={control} placeholder={tab.search} value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} /></Field>
      <Field label="Trạng thái" htmlFor="master-status"><select id="master-status" className={control} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as MasterDataStatus | "all" })}>
        <option value="all">Tất cả trạng thái</option><option value="active">{masterDataStatusLabels.active}</option><option value="inactive">{masterDataStatusLabels.inactive}</option>
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <DataTable caption={tab.label}
      head={<><Th className="w-44">{tab.codeHeader}</Th><Th>{tab.nameHeader}</Th><Th className="w-36">{tab.metricHeader}</Th><Th className="w-36">Trạng thái</Th><Th className="w-32">Thao tác</Th></>}
      footer={state ? undefined : <Pagination from={from} to={to} total={pagination.total} page={page} pages={pagination.totalPages} onPage={setPage} />}>
      {state ? <tr><td colSpan={5} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title={`Không tìm thấy ${tab.label.toLowerCase()}`}
          description="Không có bản ghi khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ dữ liệu."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={clearFilters}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải dữ liệu nền..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải dữ liệu nền"
          description={error?.message ?? "Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."}
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reload}>Thử lại</button>} />}
      </td></tr> : items.map((row) => <tr key={row.code}>
        <Td><Stack primary={row.code} secondary={`Cập nhật ${formatDate(row.updatedAt)}`} strong /></Td>
        <Td><Stack primary={row.name} secondary={row.description} /></Td>
        <Td className="font-semibold tabular-nums">{tab.metric(row.metric)}</Td>
        <Td><StatusBadge status={masterDataStatusLabels[row.status]} /></Td>
        <Td><button type="button" className="inline-flex min-h-10 items-center font-semibold text-brand hover:underline"
          onClick={() => setNotice(`Chi tiết ${row.code} · ${row.name} chưa có màn hình thiết kế; dữ liệu hiện chỉ xem được trong bảng.`)}>Chi tiết →</button></Td>
      </tr>)}
    </DataTable>

    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="related-data" className={`${card} p-6`}>
        <h2 id="related-data" className="text-xl font-semibold">Dữ liệu liên quan</h2>
        <p className="mt-4 leading-relaxed text-muted">Loài thú cưng: {count("petType")} · Giống: {count("breed")} · Thương hiệu: {count("brand")}.</p>
      </section>
      <section aria-labelledby="operating-rules" className={`${card} p-6`}>
        <h2 id="operating-rules" className="text-xl font-semibold">Quy ước vận hành</h2>
        <p className="mt-4 leading-relaxed text-muted">Đơn vị: {count("unit")} · Phương thức vận chuyển: {count("shippingMethod")}.</p>
      </section>
    </div>
  </>;
}
