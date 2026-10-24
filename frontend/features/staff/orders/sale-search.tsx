"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { control, secondaryButton } from "../components/staff-ui";
import { formatCurrency } from "@/lib/format-currency";
import { findSaleCustomers, findSaleProducts, SaleApiError, type Lookup, type SaleCustomer, type SaleProduct } from "./sale-api";

function useLookup<T>(query: string, minimum: number, load: (query: string, page: number, signal?: AbortSignal) => Promise<Lookup<T>>) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Lookup<T> | null>(null);
  const [resultKey, setResultKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setResult(null); setError("");
      if (query.trim().length < minimum) { setLoading(false); return; }
      setLoading(true);
      try {
        const rows = await load(query.trim(), page, controller.signal);
        if (!controller.signal.aborted) { setResult(rows); setResultKey(`${query}:${page}:${revision}`); }
      } catch (failure) {
        if (controller.signal.aborted) return;
        if (failure instanceof SaleApiError && (failure.status === 401 || failure.code === "PROFILE_INCOMPLETE")) router.replace("/login");
        else if (failure instanceof SaleApiError && failure.code === "FORBIDDEN") router.replace("/forbidden");
        else setError("Chưa thể tải kết quả. Vui lòng thử lại.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, minimum, load, revision, router]);
  return { result: resultKey === `${query}:${page}:${revision}` ? result : null,
    loading, error, page, setPage, retry: () => retry((v) => v + 1) };
}

function SearchStatus({ loading, error, empty, retry }: { loading: boolean; error: string; empty: boolean; retry: () => void }) {
  if (loading) return <p role="status" className="py-4 text-sm text-muted">Đang tìm…</p>;
  if (error) return <div role="alert" className="py-4 text-sm text-danger">{error} <button type="button" onClick={retry} className="min-h-10 font-semibold underline">Thử lại</button></div>;
  if (empty) return <p role="status" className="py-4 text-sm text-muted">Không có kết quả phù hợp.</p>;
  return null;
}
function Paging({ page, more, go }: { page: number; more: boolean; go: (page: number) => void }) {
  if (page === 1 && !more) return null;
  return <div className="mt-3 flex items-center justify-between gap-2 text-sm">
    <button type="button" className={secondaryButton} disabled={page === 1} onClick={() => go(page - 1)}>Trước</button>
    <span>Trang {page}</span><button type="button" className={secondaryButton} disabled={!more || page >= 100} onClick={() => go(page + 1)}>Tiếp</button>
  </div>;
}

export function SaleCustomerSearch({ selected, onSelect, error }: { selected: SaleCustomer | null; onSelect: (customer: SaleCustomer | null) => void; error?: string }) {
  const [query, setQuery] = useState("");
  const search = useLookup(query, 2, findSaleCustomers);
  return <div className="space-y-3">
    <label htmlFor="sale-customer" className="block text-sm font-medium">Tìm Customer có tài khoản</label>
    <input id="sale-customer" className={`${control} w-full`} type="search" maxLength={100} value={query}
      placeholder="Tên, điện thoại hoặc email (từ 2 ký tự)" aria-invalid={Boolean(error)} aria-describedby={error ? "sale-customer-error" : undefined}
      onChange={(event) => { setQuery(event.target.value); search.setPage(1); }} />
    {error && <p id="sale-customer-error" role="alert" className="text-xs text-danger">{error}</p>}
    {selected && <div className="rounded-lg bg-brand-subtle p-4 text-sm"><strong>{selected.fullName}</strong><p className="mt-1 break-all text-muted">{selected.phone} · {selected.email}</p><button type="button" onClick={() => onSelect(null)} className="mt-2 min-h-10 font-semibold text-brand">Bỏ chọn khách hàng</button></div>}
    <SearchStatus loading={search.loading} error={search.error} empty={Boolean(search.result && !search.result.items.length)} retry={search.retry} />
    <ul className="divide-y divide-line">{search.result?.items.map((customer) => <li key={customer.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0"><p className="font-semibold">{customer.fullName}</p><p className="mt-1 break-all text-xs text-muted">{customer.phone} · {customer.email}</p></div>
      <button type="button" className={secondaryButton} onClick={() => onSelect(customer)} disabled={selected?.id === customer.id}>{selected?.id === customer.id ? "Đã chọn" : "Chọn khách"}</button>
    </li>)}</ul>
    {search.result && <Paging page={search.page} more={search.result.hasMore} go={search.setPage} />}
  </div>;
}

export function SaleProductSearch({ onAdd, canAdd, error }: { onAdd: (product: SaleProduct) => void; canAdd: (product: SaleProduct) => boolean; error?: string }) {
  const [query, setQuery] = useState("");
  const search = useLookup(query, 0, findSaleProducts);
  return <div className="mt-5 space-y-3">
    <label htmlFor="sale-items" className="block text-sm font-medium">Tìm sản phẩm đang bán</label>
    <input id="sale-items" className={`${control} w-full`} type="search" maxLength={100} value={query}
      placeholder="Tên sản phẩm hoặc mã SKU" aria-invalid={Boolean(error)} aria-describedby={error ? "sale-items-error" : undefined}
      onChange={(event) => { setQuery(event.target.value); search.setPage(1); }} />
    {error && <p id="sale-items-error" role="alert" className="text-xs text-danger">{error}</p>}
    <SearchStatus loading={search.loading} error={search.error} empty={Boolean(search.result && !search.result.items.length)} retry={search.retry} />
    <button type="button" onClick={search.retry} className="min-h-10 text-xs font-semibold text-brand">Cập nhật giá và tồn</button>
    <ul className="divide-y divide-line">{search.result?.items.map((product) => <li key={product.sku} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
      <div className="min-w-0 flex-1"><p className="break-words font-semibold">{product.name}</p><p className="mt-1 break-words text-xs text-muted">{product.sku} · {product.variantLabel} · Còn {product.availableStock}</p><p className="mt-2 font-semibold">{formatCurrency(product.price)}</p></div>
      <button type="button" className={secondaryButton} disabled={!canAdd(product)} onClick={() => onAdd(product)}>Thêm</button>
    </li>)}</ul>
    {search.result && <Paging page={search.page} more={search.result.hasMore} go={search.setPage} />}
    <p className="text-xs text-muted">Tồn khả dụng tại lần tải này. Hệ thống kiểm tra lại giá và tồn khi tạo đơn.</p>
  </div>;
}
