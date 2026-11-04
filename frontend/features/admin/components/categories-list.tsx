"use client";

import Link from "next/link";
import { CircleX, FolderOpen, Package, Pencil, Trash2 } from "lucide-react";
import { Field, ListState, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useCategoryTree } from "../hooks/use-category-tree";
import { categoryStatusLabels } from "../status";
import type { CategoryStatus } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { DataTable, StatusBadge, Td, Th } from "./admin-ui";

const iconButton = "inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand hover:bg-brand-subtle";

export function CategoriesList() {
  const { draft, setDraft, submit, reset, reload, items, counts, state, error, deleting, pending, deleteError, notice, askDelete, cancelDelete, confirmDelete } = useCategoryTree();

  return <>
    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,360px)_232px_auto] md:justify-start" aria-label="Bộ lọc danh mục">
      <Field label="Tìm kiếm" htmlFor="category-filter-query"><input id="category-filter-query" type="search" className={control} placeholder="Tìm theo tên danh mục" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} /></Field>
      <Field label="Trạng thái" htmlFor="category-filter-status"><select id="category-filter-status" className={control} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as CategoryStatus | "all" })}>
        <option value="all">Tất cả trạng thái</option><option value="active">{categoryStatusLabels.active}</option><option value="hidden">{categoryStatusLabels.hidden}</option>
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <DataTable caption="Danh sách danh mục sản phẩm"
      head={<><Th className="text-sm text-ink">Tên danh mục</Th><Th className="w-40 text-sm text-ink">Mã</Th><Th className="w-36 text-sm text-ink">Sản phẩm</Th><Th className="w-40 text-sm text-ink">Trạng thái</Th><Th className="w-32 text-sm text-ink">Thao tác</Th></>}>
      {state ? <tr><td colSpan={5} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy danh mục"
          description="Không có danh mục khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ danh mục."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reset}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải danh mục..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải danh mục"
          description={error?.message ?? "Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."}
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reload}>Thử lại</button>} />}
      </td></tr> : items.map((category) => <tr key={category.id}>
        <Td>
          <span className="flex items-center gap-4 whitespace-nowrap font-medium"><FolderOpen className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden="true" />{category.name}</span>
        </Td>
        <Td className="text-muted">{category.code ?? "—"}</Td>
        <Td className="tabular-nums">{category.productCount.toLocaleString("vi-VN")}</Td>
        <Td><StatusBadge status={categoryStatusLabels[category.status]} /></Td>
        <Td><span className="flex gap-1">
          <Link href={`/admin/categories/${category.ref}/edit`} className={iconButton} aria-label={`Chỉnh sửa ${category.name}`}><Pencil className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></Link>
          <button type="button" className={iconButton} aria-label={`Xóa ${category.name}`} onClick={() => askDelete(category)}><Trash2 className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></button>
        </span></Td>
      </tr>)}
    </DataTable>
    <p className="text-xs text-muted">{(counts?.all ?? 0).toLocaleString("vi-VN")} danh mục · Sắp xếp thứ tự hiển thị trong trang chỉnh sửa. Xóa danh mục chỉ khi không còn sản phẩm liên kết.</p>

    <AdminConfirmDialog open={Boolean(deleting)} danger pending={pending} error={deleteError} onConfirm={confirmDelete} onClose={cancelDelete}
      title="Xóa danh mục?" confirmLabel="Xóa danh mục"
      description={`“${deleting?.name ?? ""}” sẽ bị xóa vĩnh viễn. Danh mục còn sản phẩm sẽ không thể xóa.`} />
  </>;
}
