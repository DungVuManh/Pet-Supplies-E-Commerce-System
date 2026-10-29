"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleX, CornerDownRight, FolderOpen, Package, Pencil, Trash2 } from "lucide-react";
import { Field, ListState, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useListState } from "@/components/workspace/use-list-state";
import { categories, filterCategories, type CategoryFilter, type CategoryStatus } from "../mock/categories";
import { categoryDeleteBlocker, categoryProductCount } from "../mock/products";
import { DataTable, StatusBadge, Td, Th } from "./admin-ui";

const initial: CategoryFilter = { query: "", status: "all" };
const iconButton = "inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand hover:bg-brand-subtle";

export function CategoriesList() {
  const pathname = usePathname();
  const reviewState = useListState();
  const [filter, setFilter] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [notice, setNotice] = useState("");

  const rows = filterCategories(filter);
  const state = reviewState ?? (rows.length === 0 ? "empty" : null);

  function apply(next: CategoryFilter) { setFilter(next); setDraft(next); setNotice(""); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); apply(draft); }
  function remove(code: string, name: string) {
    const blocker = categoryDeleteBlocker(code);
    setNotice(blocker ? `Không thể xóa “${name}”: ${blocker}. Chuyển sản phẩm sang danh mục khác trước khi xóa.` : `Xóa “${name}” chưa kết nối backend; danh mục vẫn được giữ nguyên.`);
  }

  return <>
    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,360px)_232px_auto] md:justify-start" aria-label="Bộ lọc danh mục">
      <Field label="Tìm kiếm" htmlFor="category-query"><input id="category-query" type="search" className={control} placeholder="Tìm theo tên danh mục" value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} /></Field>
      <Field label="Trạng thái" htmlFor="category-status"><select id="category-status" className={control} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as CategoryStatus | "all" })}>
        <option value="all">Tất cả trạng thái</option><option value="Hiển thị">Hiển thị</option><option value="Đã ẩn">Đã ẩn</option>
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <DataTable caption="Cây danh mục sản phẩm"
      head={<><Th className="text-sm text-ink">Tên danh mục</Th><Th className="w-40 text-sm text-ink">Mã</Th><Th className="w-36 text-sm text-ink">Sản phẩm</Th><Th className="w-40 text-sm text-ink">Trạng thái</Th><Th className="w-32 text-sm text-ink">Thao tác</Th></>}>
      {state ? <tr><td colSpan={5} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy danh mục"
          description="Không có danh mục khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ cây danh mục."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={() => apply(initial)}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải cây danh mục..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải danh mục"
          description="Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."
          action={<Link href={pathname} className={`${primaryLink} min-h-10`}>Thử lại</Link>} />}
      </td></tr> : rows.map(({ category, context }) => <tr key={category.code} className={context ? "text-muted" : ""}>
        <Td>{category.parent
          ? <span className="flex items-center gap-4 whitespace-nowrap pl-8"><CornerDownRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden="true" />{category.name}</span>
          : <span className="flex items-center gap-4 whitespace-nowrap font-semibold"><FolderOpen className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden="true" />{category.name}</span>}
        </Td>
        <Td className="text-muted">{category.code}</Td>
        <Td className="tabular-nums">{categoryProductCount(category.code)}</Td>
        <Td><StatusBadge status={category.status} /></Td>
        <Td><span className="flex gap-1">
          <Link href={`/admin/categories/${category.code}/edit`} className={iconButton} aria-label={`Chỉnh sửa ${category.name}`}><Pencil className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></Link>
          <button type="button" className={iconButton} aria-label={`Xóa ${category.name}`} onClick={() => remove(category.code, category.name)}><Trash2 className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></button>
        </span></Td>
      </tr>)}
    </DataTable>
    <p className="text-xs text-muted">{categories.length} danh mục · Sắp xếp thứ tự hiển thị trong trang chỉnh sửa. Xóa danh mục chỉ khi không còn sản phẩm liên kết.</p>
  </>;
}
