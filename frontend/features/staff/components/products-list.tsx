"use client";

import { useEffect, useMemo, useState } from "react";
import {
  money,
  normalize,
  products as fallbackProducts,
  type ProductStatus,
  type StockStatus,
} from "../mock-data";
import {
  ActionLink,
  Badge,
  PageHeader,
  TableFrame,
  TableHead,
  Td,
  Th,
  control,
  productLabels,
  stockLabels,
  stockTones,
  secondaryButton,
} from "./staff-ui";

export type StaffProductItem = {
  productId?: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  weight: string;
  price: number;
  physical: number;
  reserved: number;
  availableStock: number;
  threshold: number;
  stockStatus: StockStatus;
  status: ProductStatus;
  image: string;
  updated: string;
  description?: string;
};

export function ProductsList() {
  const [items, setItems] = useState<StaffProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [summary, setSummary] = useState({ totalProducts: 0, totalActive: 0, totalHidden: 0 });
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"api" | "mock">("api");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [stock, setStock] = useState<StockStatus | "all">("all");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        // Call backend staff products API
        const response = await fetch("/api/v1/staff/products", {
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const json = await response.json();
        if (json.success && json.data) {
          if (!isMounted) return;
          const apiItems: StaffProductItem[] = json.data.items || [];
          setItems(apiItems);
          setCategories(json.data.categories || [...new Set(apiItems.map((p) => p.category))]);
          setSummary(
            json.data.summary || {
              totalProducts: apiItems.length,
              totalActive: apiItems.filter((i) => i.status === "active").length,
              totalHidden: apiItems.filter((i) => i.status === "hidden").length,
            }
          );
          setDataSource("api");
          return;
        }
        throw new Error("Invalid response format");
      } catch (err) {
        console.warn("[ProductsList] Falling back to local data:", err);
        if (!isMounted) return;
        // Fallback to local data if unauthorized or backend is still starting up
        const mappedFallback: StaffProductItem[] = fallbackProducts.map((p) => {
          const avail = p.physical - p.reserved;
          return {
            sku: p.sku,
            name: p.name,
            category: p.category,
            brand: p.brand,
            weight: p.weight,
            price: p.price,
            physical: p.physical,
            reserved: p.reserved,
            availableStock: avail,
            threshold: p.threshold,
            stockStatus: avail === 0 ? "out" : avail <= p.threshold ? "low" : "available",
            status: p.status,
            image: p.image,
            updated: p.updated,
            description: p.shortDescription,
          };
        });
        setItems(mappedFallback);
        setCategories([...new Set(mappedFallback.map((p) => p.category))]);
        setSummary({
          totalProducts: mappedFallback.length,
          totalActive: mappedFallback.filter((i) => i.status === "active").length,
          totalHidden: mappedFallback.filter((i) => i.status === "hidden").length,
        });
        setDataSource("mock");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const reset = () => {
    setQuery("");
    setCategory("all");
    setStatus("all");
    setStock("all");
  };

  // Filter items in memory
  const rows = useMemo(() => {
    const q = normalize(query);
    const tokens = q.split(" ").filter(Boolean);

    return items.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (status !== "all" && p.status !== status) return false;
      if (stock !== "all" && p.stockStatus !== stock) return false;

      if (tokens.length > 0) {
        const text = normalize(`${p.name} ${p.sku} ${p.brand} ${p.category}`);
        if (!tokens.every((token) => text.includes(token))) return false;
      }

      return true;
    });
  }, [items, query, category, status, stock]);

  const subtitle = `${summary.totalProducts} sản phẩm · ${summary.totalActive} đang bán · ${summary.totalHidden} tạm ẩn · Kho TP.HCM${
    dataSource === "api" ? " (MongoDB Live)" : ""
  }`;

  return (
    <>
      <PageHeader
        title="Danh sách sản phẩm"
        subtitle={subtitle}
        action={
          <button
            className={secondaryButton}
            onClick={() => setNotice("Danh sách xuất đã được ghi nhận vào hàng đợi hệ thống.")}
          >
            Xuất danh sách
          </button>
        }
      />

      {notice && (
        <p role="status" className="rounded-lg bg-brand-subtle p-4 text-brand">
          {notice}
        </p>
      )}

      {!loading && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-canvas p-4" aria-label="Tổng quan tồn kho">
          <strong>{items.length} sản phẩm</strong>
          {(["available", "low", "out"] as const).map((state) => (
            <Badge key={state} tone={stockTones[state]}>
              {items.filter((p) => p.stockStatus === state).length} {stockLabels[state].toLowerCase()}
            </Badge>
          ))}
          <span className="text-xs text-muted">Khả dụng = thực tế − giữ chỗ</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="grid gap-2 font-medium">
          Tìm kiếm
          <input
            className={control}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tên sản phẩm hoặc mã SKU"
          />
        </label>
        <label className="grid gap-2 font-medium">
          Danh mục
          <select className={control} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 font-medium">
          Trạng thái
          <select
            className={control}
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus | "all")}
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang bán</option>
            <option value="hidden">Tạm ẩn</option>
          </select>
        </label>
        <label className="grid gap-2 font-medium">
          Tồn khả dụng
          <select
            className={control}
            value={stock}
            onChange={(e) => setStock(e.target.value as StockStatus | "all")}
          >
            <option value="all">Tất cả</option>
            {Object.entries(stockLabels).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap justify-between gap-4 text-xs text-muted">
        <p>Cập nhật mới nhất trước · Giá bán đã gồm VAT</p>
        <button className="min-h-10 font-semibold text-brand" onClick={reset}>
          Xóa bộ lọc
        </button>
      </div>

      <TableFrame>
        <TableHead>
          <Th>SKU / Cập nhật</Th>
          <Th>Sản phẩm</Th>
          <Th right>Giá bán</Th>
          <Th right>Số lượng</Th>
          <Th>Tồn kho</Th>
          <Th>Trạng thái</Th>
          <Th>Thao tác</Th>
        </TableHead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted">
                Đang tải dữ liệu sản phẩm từ máy chủ...
              </td>
            </tr>
          ) : (
            rows.map((p) => (
              <tr key={p.sku}>
                <Td>
                  <strong>{p.sku}</strong>
                  <p className="mt-2 text-xs text-muted">{p.updated}</p>
                </Td>
                <Td>
                  {p.name}
                  <p className="mt-2 text-xs text-muted">
                    {p.category} · {p.weight} · {p.brand}
                  </p>
                </Td>
                <Td right>
                  <strong>{money(p.price)}</strong>
                </Td>
                <Td right>
                  <strong>{p.physical} thực tế</strong>
                  <p className="mt-2 text-xs text-muted">{p.reserved} giữ chỗ</p>
                  <p className="mt-2 text-xs text-muted">{p.availableStock} khả dụng</p>
                </Td>
                <Td>
                  <Badge tone={stockTones[p.stockStatus]}>{stockLabels[p.stockStatus]}</Badge>
                  <p className="mt-2 text-xs text-muted">Ngưỡng: {p.threshold}</p>
                </Td>
                <Td>
                  <Badge tone={p.status === "active" ? "success" : "neutral"}>
                    {productLabels[p.status]}
                  </Badge>
                </Td>
                <Td>
                  <ActionLink href={`/staff/products/${p.sku}`}>Chi tiết</ActionLink>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableFrame>

      {!loading && rows.length === 0 && (
        <p className="rounded-lg bg-canvas p-8 text-center text-muted">
          Không có sản phẩm phù hợp.
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-4 text-xs text-muted">
        <p>
          Hiển thị {rows.length} trong {summary.totalProducts} sản phẩm
        </p>
        <p>
          ‹ Trước　
          <strong className="rounded-full bg-brand-subtle px-4 py-2 text-brand">
            Trang 1 / 1
          </strong>
          　Tiếp ›
        </p>
      </div>

      <p className="text-xs text-muted">
        Staff được sửa nội dung, trạng thái và số lượng. Giá bán và danh mục do quản lý thiết lập.
      </p>
    </>
  );
}
