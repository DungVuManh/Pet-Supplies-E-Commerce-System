"use client";

import Link from "next/link";
import { CircleX, Package, Pencil, Tag, Trash2 } from "lucide-react";
import { Field, ListState, Pagination, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDate } from "@/lib/format";
import { useBrandsList } from "../hooks/use-brands-list";
import { masterDataStatusLabels } from "../status";
import type { MasterDataStatus } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";

const iconButton = "inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand hover:bg-brand-subtle";

export function BrandsList() {
  const { draft, setDraft, submit, reset, reload, items, state, error, page, setPage, pagination, from, to, deleting, pending, deleteError, notice, askDelete, cancelDelete, confirmDelete } = useBrandsList();

  return <>
    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,360px)_232px_auto] md:justify-start" aria-label="Bộ lọc thương hiệu">
      <Field label="Tìm kiếm" htmlFor="brand-filter-query"><input id="brand-filter-query" type="search" className={control} placeholder="Tên, mã hoặc xuất xứ" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} /></Field>
      <Field label="Trạng thái" htmlFor="brand-filter-status"><select id="brand-filter-status" className={control} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as MasterDataStatus | "all" })}>
        <option value="all">Tất cả trạng thái</option><option value="active">{masterDataStatusLabels.active}</option><option value="inactive">{masterDataStatusLabels.inactive}</option>
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <DataTable caption="Danh sách thương hiệu"
      head={<><Th className="text-sm text-ink">Thương hiệu / Xuất xứ</Th><Th className="w-48 text-sm text-ink">Mã</Th><Th className="w-32 text-sm text-ink">Sản phẩm</Th><Th className="w-36 text-sm text-ink">Trạng thái</Th><Th className="w-32 text-sm text-ink">Thao tác</Th></>}
      footer={state ? undefined : <Pagination from={from} to={to} total={pagination.total} page={page} pages={pagination.totalPages} onPage={setPage} />}>
      {state ? <tr><td colSpan={5} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy thương hiệu"
          description="Không có thương hiệu khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ thương hiệu."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reset}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải thương hiệu..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải thương hiệu"
          description={error?.message ?? "Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."}
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reload}>Thử lại</button>} />}
      </td></tr> : items.map((brand) => <tr key={brand.code}>
        <Td><span className="flex items-start gap-4">
          <Tag className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden="true" />
          <Stack primary={<span className="font-medium">{brand.name}</span>} secondary={brand.description || "Chưa có xuất xứ"} />
        </span></Td>
        <Td><Stack primary={<span className="text-muted">{brand.code}</span>} secondary={`Cập nhật ${formatDate(brand.updatedAt)}`} /></Td>
        <Td className="tabular-nums">{Number(brand.metric).toLocaleString("vi-VN")}</Td>
        <Td><StatusBadge status={masterDataStatusLabels[brand.status]} /></Td>
        <Td><span className="flex gap-1">
          <Link href={`/admin/brands/${encodeURIComponent(brand.code)}/edit`} className={iconButton} aria-label={`Chỉnh sửa ${brand.name}`}><Pencil className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></Link>
          <button type="button" className={iconButton} aria-label={`Xóa ${brand.name}`} onClick={() => askDelete(brand)}><Trash2 className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></button>
        </span></Td>
      </tr>)}
    </DataTable>
    <p className="text-xs text-muted">Thương hiệu đang có sản phẩm không thể đổi tên hoặc xóa; hãy chuyển sang {masterDataStatusLabels.inactive.toLowerCase()} để ngừng dùng.</p>

    <AdminConfirmDialog open={Boolean(deleting)} danger pending={pending} error={deleteError} onConfirm={confirmDelete} onClose={cancelDelete}
      title="Xóa thương hiệu?" confirmLabel="Xóa thương hiệu"
      description={`“${deleting?.name ?? ""}” sẽ bị xóa vĩnh viễn. Thương hiệu còn sản phẩm sẽ không thể xóa.`} />
  </>;
}
