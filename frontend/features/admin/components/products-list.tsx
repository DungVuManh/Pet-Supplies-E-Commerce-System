"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleX, Package } from "lucide-react";
import { ActionLink, Field, ListState, Pagination, TabNav, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useListState } from "@/components/workspace/use-list-state";
import { categories } from "../mock/categories";
import { countProducts, filterProducts, formatVnd, productCategoryName, productStatus, type ProductFilter, type ProductStatus } from "../mock/products";
import { DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";

const PAGE_SIZE = 6;
const initial: ProductFilter = { tab: "all", query: "", category: "all", status: "all" };
const tabs: { value: ProductFilter["tab"]; label: string }[] = [
  { value: "all", label: "Tất cả" }, { value: "Đang bán", label: "Đang bán" }, { value: "Đã ẩn", label: "Đã ẩn" },
];

export function ProductsList() {
  const pathname = usePathname();
  const reviewState = useListState();
  const [filter, setFilter] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [page, setPage] = useState(1);

  const rows = filterProducts(filter);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const state = reviewState ?? (rows.length === 0 ? "empty" : null);

  function apply(next: ProductFilter) { setFilter(next); setDraft(next); setPage(1); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); apply({ ...draft, tab: filter.tab }); }

  return <>
    <TabNav label="Lọc theo hiển thị" items={tabs.map((tab) => ({ label: `${tab.label} (${countProducts(tab.value)})`, active: filter.tab === tab.value, onSelect: () => apply({ ...filter, tab: tab.value }) }))} />

    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_232px_232px_auto]" aria-label="Bộ lọc sản phẩm">
      <Field label="Tìm kiếm" htmlFor="product-query"><input id="product-query" type="search" className={control} placeholder="Tên sản phẩm hoặc SKU" value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} /></Field>
      <Field label="Danh mục" htmlFor="product-category"><select id="product-category" className={control} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
        <option value="all">Tất cả danh mục</option>
        {categories.map((category) => <option key={category.code} value={category.code}>{category.parent ? `— ${category.name}` : category.name}</option>)}
      </select></Field>
      <Field label="Trạng thái" htmlFor="product-status"><select id="product-status" className={control} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ProductStatus | "all" })}>
        <option value="all">Tất cả trạng thái</option><option value="Đang bán">Đang bán</option><option value="Sắp hết hàng">Sắp hết hàng</option><option value="Đã ẩn">Đã ẩn</option>
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>

    <DataTable caption="Danh sách sản phẩm"
      head={<><Th className="w-44">SKU / Mã</Th><Th>Sản phẩm / Danh mục</Th><Th>Giá bán</Th><Th>Trạng thái</Th><Th>Thao tác</Th></>}
      footer={state ? undefined : <Pagination from={(page - 1) * PAGE_SIZE + 1} to={(page - 1) * PAGE_SIZE + visible.length} total={rows.length} page={page} pages={pages} onPage={setPage} />}>
      {state ? <tr><td colSpan={5} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy sản phẩm"
          description="Không có sản phẩm khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ sản phẩm."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={() => apply(initial)}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải danh sách sản phẩm..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải danh sách sản phẩm"
          description="Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."
          action={<Link href={pathname} className={`${primaryLink} min-h-10`}>Thử lại</Link>} />}
      </td></tr> : visible.map((product) => <tr key={product.sku}>
        <Td><Stack primary={product.sku} secondary={`SKU · ${product.id}`} strong /></Td>
        <Td><Stack primary={product.name} secondary={`${productCategoryName(product)} · ${product.brand}`} /></Td>
        <Td className="font-semibold tabular-nums">{formatVnd(product.price)}</Td>
        <Td><StatusBadge status={productStatus(product)} /></Td>
        <Td><ActionLink href={`/admin/products/${product.sku}`}>Chi tiết</ActionLink></Td>
      </tr>)}
    </DataTable>
  </>;
}
