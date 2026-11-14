"use client";

import Link from "next/link";
import { useState } from "react";
import { DetailList, TabNav, card, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDateTime, formatVnd } from "@/lib/format";
import { useProductVisibility } from "../hooks/use-product-visibility";
import { petTypeLabels, productStatusLabels } from "../status";
import type { AdminProductDetail } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminPageHeader, StatusBadge } from "./admin-ui";
import { ProductImage } from "./product-image";

type Tab = "description" | "extra" | "history";
const tabs: { value: Tab; label: string }[] = [
  { value: "description", label: "Mô tả sản phẩm" }, { value: "extra", label: "Thông tin bổ sung" }, { value: "history", label: "Lịch sử thay đổi" },
];

export function ProductDetailView({ product }: { product: AdminProductDetail }) {
  const visibility = useProductVisibility(product);
  const [tab, setTab] = useState<Tab>("description");
  const [imageIndex, setImageIndex] = useState(0);
  const unit = product.unit.toLowerCase();
  const quantity = (value: number) => `${value.toLocaleString("vi-VN")}${unit ? ` ${unit}` : ""}`;
  const image = product.images[imageIndex] ?? product.images[0];

  return <>
    <AdminPageHeader breadcrumbs={["Sản phẩm", product.name]} title={product.name}
      subtitle={`${product.code} · SKU ${product.sku} · Cập nhật ${formatDateTime(product.updatedAt)}`}
      actions={<>
        <button type="button" onClick={visibility.toggle} disabled={visibility.pending} className={`${secondaryButton} min-h-12 disabled:opacity-60`}>{visibility.isActive ? "Ẩn sản phẩm" : "Hiện sản phẩm"}</button>
        <Link href={`/admin/products/${encodeURIComponent(product.sku)}/edit`} className={`${primaryLink} min-h-12 px-8`}>Chỉnh sửa</Link>
      </>} />
    {visibility.notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{visibility.notice}</p>}

    <div className="grid gap-6 lg:grid-cols-[416px_minmax(0,1fr)]">
      <section aria-labelledby="product-images" className={`${card} min-w-0 p-6`}>
        <h2 id="product-images" className="text-xl font-semibold">Hình ảnh sản phẩm</h2>
        <ProductImage src={image} alt={product.name} sizes="(min-width: 1024px) 368px, 100vw" className="mt-4 aspect-[4/3]" />
        {product.images.length > 1 && <ul className="mt-4 flex flex-wrap gap-4" aria-label="Ảnh sản phẩm">
          {product.images.slice(0, 4).map((src, index) => <li key={src}>
            <button type="button" onClick={() => setImageIndex(index)} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={index === imageIndex} className="block rounded-lg">
              <ProductImage src={src} alt="" sizes="80px" className={`h-20 w-20 ${index === imageIndex ? "ring-2 ring-brand" : ""}`} />
            </button>
          </li>)}
        </ul>}
      </section>
      <section aria-labelledby="product-info" className={`${card} min-w-0 p-6`}>
        <h2 id="product-info" className="text-xl font-semibold">Thông tin sản phẩm</h2>
        <div className="mt-4"><StatusBadge status={productStatusLabels[visibility.status]} /></div>
        <div className="mt-2"><DetailList items={[
          { label: "Giá bán", value: formatVnd(product.price) },
          { label: "Giá vốn", value: product.cost === null ? "Chưa có" : formatVnd(product.cost) },
          { label: "Tồn kho khả dụng", value: quantity(product.available) },
          { label: "Danh mục", value: product.categories.map((category) => category.path).join(", ") || "Chưa phân loại" },
          { label: "Thương hiệu", value: product.brand || "—" },
          { label: "Đơn vị / Phân loại", value: `${product.unit || "—"} / ${product.label}` },
          { label: "Người cập nhật", value: product.lastUpdate?.actorName ?? "—" },
        ]} /></div>
      </section>
    </div>

    <TabNav label="Thông tin chi tiết sản phẩm" items={tabs.map((item) => ({ label: item.label, active: tab === item.value, onSelect: () => setTab(item.value) }))} />
    <section aria-label={tabs.find((item) => item.value === tab)?.label} className={`${card} p-6`}>
      {tab === "description" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ink mb-1">Mô tả sản phẩm</h3>
            {product.description
              ? <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
              : <p className="text-muted">Sản phẩm chưa có mô tả.</p>}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink mb-1">Thành phần &amp; hướng dẫn</h3>
            {product.components
              ? <p className="whitespace-pre-line leading-relaxed">{product.components}</p>
              : <p className="text-muted">Chưa có thông tin thành phần.</p>}
          </div>
        </div>
      )}
      {tab === "extra" && <DetailList items={[
        { label: "Mã sản phẩm", value: product.code },
        { label: "Loài thú cưng", value: petTypeLabels[product.petType] ?? product.petType },
        { label: "Tồn kho thực tế", value: quantity(product.stock) },
        { label: "Đang giữ cho đơn hàng", value: quantity(product.reservedStock) },
        { label: "Ngưỡng cảnh báo tồn kho", value: `${quantity(product.threshold)}${product.ownThreshold === null ? " (mặc định của hệ thống)" : ""}` },
        { label: "Đã phát sinh đơn hàng", value: product.hasOrders ? "Có" : "Chưa" },
      ]} />}
      {tab === "history" && (product.history.length === 0
        ? <p className="text-muted">Chưa có thay đổi nào được ghi nhận.</p>
        : <ul className="divide-y divide-line">
          {product.history.map((entry) => <li key={entry.id} className="py-3">
            <p className="font-semibold">{entry.title}</p>
            <p className="mt-1 text-xs text-muted">{formatDateTime(entry.at)}{entry.actorName ? ` · ${entry.actorName}` : ""}</p>
          </li>)}
        </ul>)}
    </section>

    <AdminConfirmDialog open={visibility.confirming} danger pending={visibility.pending} error={visibility.error} onConfirm={visibility.confirmHide} onClose={visibility.cancelHide}
      title="Ẩn sản phẩm?" confirmLabel="Ẩn sản phẩm"
      description={`“${product.name}” sẽ không còn hiển thị với khách hàng. Thao tác này áp dụng cho mọi phân loại của sản phẩm và có thể hiện lại bất cứ lúc nào.`} />
  </>;
}
