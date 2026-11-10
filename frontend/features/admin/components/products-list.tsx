"use client";

import { CircleX, Package } from "lucide-react";
import { ActionLink, Field, ListState, Pagination, TabNav, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatVnd } from "@/lib/format";
import { useProductsList } from "../hooks/use-products-list";
import { productStatusLabels } from "../status";
import type { AdminProductRow, ProductFilter, ProductStatus } from "../types";
import { DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";

const tabs: { value: ProductFilter["tab"]; label: string }[] = [
  { value: "all", label: "Tất cả" }, { value: "active", label: "Đang bán" }, { value: "hidden", label: "Đã ẩn" },
];

/** The first category's path, then how many more; a product can be in several. */
function categoryText({ categories, brand }: AdminProductRow) {
  const [first, ...others] = categories;
  const category = first ? first.path + (others.length ? ` +${others.length}` : "") : "Chưa phân loại";
  return brand ? `${category} · ${brand}` : category;
}

export function ProductsList() {
  const { filter, draft, setDraft, apply, reset, reload, items, counts, state, error, page, setPage, pagination, from, to, categories } = useProductsList();

  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); apply({ ...draft, tab: filter.tab }); }

  return <>
    <TabNav label="Lọc theo hiển thị" items={tabs.map((tab) => ({ label: `${tab.label} (${(counts?.[tab.value] ?? 0).toLocaleString("vi-VN")})`, active: filter.tab === tab.value, onSelect: () => apply({ ...filter, tab: tab.value }) }))} />

    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_232px_232px_auto]" aria-label="Bộ lọc sản phẩm">
      <Field label="Tìm kiếm" htmlFor="product-query"><input id="product-query" type="search" className={control} placeholder="Tên sản phẩm hoặc SKU" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} /></Field>
      <Field label="Danh mục" htmlFor="product-filter-category"><select id="product-filter-category" className={control} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
        <option value="all">Tất cả danh mục</option>
        {categories.map((category) => <option key={category.id} value={category.ref}>{category.name}</option>)}
      </select></Field>
      <Field label="Trạng thái" htmlFor="product-filter-status"><select id="product-filter-status" className={control} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ProductStatus | "all" })}>
        <option value="all">Tất cả trạng thái</option><option value="active">{productStatusLabels.active}</option><option value="low">{productStatusLabels.low}</option><option value="hidden">{productStatusLabels.hidden}</option>
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>

    <DataTable caption="Danh sách sản phẩm"
      head={<><Th className="w-44">SKU / Mã</Th><Th>Sản phẩm / Danh mục</Th><Th>Giá bán</Th><Th>Trạng thái</Th><Th>Thao tác</Th></>}
      footer={state ? undefined : <Pagination from={from} to={to} total={pagination.total} page={page} pages={pagination.totalPages} onPage={setPage} />}>
      {state ? <tr><td colSpan={5} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy sản phẩm"
          description="Không có sản phẩm khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ sản phẩm."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reset}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải danh sách sản phẩm..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải danh sách sản phẩm"
          description={error?.message ?? "Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."}
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reload}>Thử lại</button>} />}
      </td></tr> : items.map((product) => <tr key={product.sku}>
        <Td><Stack primary={product.sku} secondary={`Mã · ${product.code}`} strong /></Td>
        <Td><Stack primary={product.name} secondary={categoryText(product)} /></Td>
        <Td className="font-semibold tabular-nums">{formatVnd(product.price)}</Td>
        <Td><StatusBadge status={productStatusLabels[product.status]} /></Td>
        <Td><ActionLink href={`/admin/products/${encodeURIComponent(product.sku)}`}>Chi tiết</ActionLink></Td>
      </tr>)}
    </DataTable>
  </>;
}
