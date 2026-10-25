"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleX, Package, Plus } from "lucide-react";
import { DemoNotice } from "@/features/workspace/components/demo-notice";
import { Field, ListState, Pagination, TabNav, card, control, primaryLink, secondaryButton } from "@/features/workspace/components/workspace-ui";
import { useListState } from "@/features/workspace/components/use-list-state";
import { filterMasterData, masterData, masterTabs, preview, type MasterFilter, type MasterKind, type MasterStatus } from "../mock/master-data";
import { products } from "../mock/products";
import { AdminPageHeader, DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";

const PAGE_SIZE = 6;
const initial: MasterFilter = { query: "", status: "all" };
const breedSample = [...masterData.breeds.slice(0, 2), masterData.breeds.find((row) => row.metric === "Mèo")].filter(Boolean).map((row) => row?.name).join(", ");
const brandSample = [...new Set(products.map((product) => product.brand))].slice(0, 4).join(", ");

export function MasterDataView() {
  const pathname = usePathname();
  const reviewState = useListState();
  const [kind, setKind] = useState<MasterKind>("pets");
  const [filter, setFilter] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const tab = masterTabs.find((item) => item.kind === kind) ?? masterTabs[0];

  const rows = filterMasterData(kind, filter);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const state = reviewState ?? (rows.length === 0 ? "empty" : null);

  function apply(next: MasterFilter) { setFilter(next); setDraft(next); setPage(1); setNotice(""); }
  function selectTab(next: MasterKind) { setKind(next); apply(initial); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); apply(draft); }

  return <>
    <AdminPageHeader breadcrumbs={["Dữ liệu nền", "Dữ liệu nền"]} title="Dữ liệu nền" subtitle="Chuẩn hóa dữ liệu dùng chung cho sản phẩm và vận hành."
      actions={<DemoNotice key={kind} variant="primary" label={tab.add} icon={<Plus className="h-4 w-4" aria-hidden="true" />}
        message={`“${tab.add}” chưa có màn hình thiết kế và chưa kết nối backend.`} />} />

    <TabNav label="Loại dữ liệu nền" items={masterTabs.map((item) => ({ label: `${item.label} (${masterData[item.kind].length})`, active: item.kind === kind, onSelect: () => selectTab(item.kind) }))} />

    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,360px)_232px_auto] md:justify-start" aria-label={`Bộ lọc ${tab.label.toLowerCase()}`}>
      <Field label="Tìm kiếm" htmlFor="master-query"><input id="master-query" type="search" className={control} placeholder={tab.search} value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} /></Field>
      <Field label="Trạng thái" htmlFor="master-status"><select id="master-status" className={control} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as MasterStatus | "all" })}>
        <option value="all">Tất cả trạng thái</option><option value="Hoạt động">Hoạt động</option><option value="Tạm ngưng">Tạm ngưng</option>
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <DataTable caption={tab.label}
      head={<><Th className="w-44">{tab.codeHeader}</Th><Th>{tab.nameHeader}</Th><Th className="w-36">{tab.metricHeader}</Th><Th className="w-36">Trạng thái</Th><Th className="w-32">Thao tác</Th></>}
      footer={state ? undefined : <Pagination from={(page - 1) * PAGE_SIZE + 1} to={(page - 1) * PAGE_SIZE + visible.length} total={rows.length} page={page} pages={pages} onPage={setPage} />}>
      {state ? <tr><td colSpan={5} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title={`Không tìm thấy ${tab.label.toLowerCase()}`}
          description="Không có bản ghi khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ dữ liệu."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={() => apply(initial)}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải dữ liệu nền..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải dữ liệu nền"
          description="Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."
          action={<Link href={pathname} className={`${primaryLink} min-h-10`}>Thử lại</Link>} />}
      </td></tr> : visible.map((row) => <tr key={row.code}>
        <Td><Stack primary={row.code} secondary={`Cập nhật ${row.updatedAt}`} strong /></Td>
        <Td><Stack primary={row.name} secondary={row.description} /></Td>
        <Td className="font-semibold tabular-nums">{row.metric}</Td>
        <Td><StatusBadge status={row.status} /></Td>
        <Td><button type="button" className="inline-flex min-h-10 items-center font-semibold text-brand hover:underline"
          onClick={() => setNotice(`Chi tiết ${row.code} · ${row.name} chưa có màn hình thiết kế; dữ liệu hiện chỉ xem được trong bảng.`)}>Chi tiết →</button></Td>
      </tr>)}
    </DataTable>

    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="related-data" className={`${card} p-6`}>
        <h2 id="related-data" className="text-xl font-semibold">Dữ liệu liên quan</h2>
        <p className="mt-4 leading-relaxed text-muted">Giống: {breedSample} · Thương hiệu: {brandSample}.</p>
      </section>
      <section aria-labelledby="operating-rules" className={`${card} p-6`}>
        <h2 id="operating-rules" className="text-xl font-semibold">Quy ước vận hành</h2>
        <p className="mt-4 leading-relaxed text-muted">Đơn vị: {preview("units", 4)} · Vận chuyển: {preview("shipping", 3)}.</p>
      </section>
    </div>
  </>;
}
