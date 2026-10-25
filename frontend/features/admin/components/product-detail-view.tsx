"use client";

import Link from "next/link";
import { useState } from "react";
import { DetailList, TabNav, card, primaryLink, secondaryButton } from "@/features/workspace/components/workspace-ui";
import { categoryPath } from "../mock/categories";
import { stockHistory } from "../mock/inventory";
import { formatVnd, productStatus, type Product, type ProductVisibility } from "../mock/products";
import { AdminPageHeader, StatusBadge } from "./admin-ui";
import { ProductImage } from "./product-image";

type Tab = "description" | "extra" | "history";
const tabs: { value: Tab; label: string }[] = [
  { value: "description", label: "Mô tả sản phẩm" }, { value: "extra", label: "Thông tin bổ sung" }, { value: "history", label: "Lịch sử thay đổi" },
];

export function ProductDetailView({ product }: { product: Product }) {
  const [visibility, setVisibility] = useState<ProductVisibility>(product.visibility);
  const [tab, setTab] = useState<Tab>("description");
  const [notice, setNotice] = useState("");
  const hidden = visibility === "Đã ẩn";
  const unit = product.unit.toLowerCase();
  const history = stockHistory.filter((entry) => entry.sku === product.sku);

  function toggleVisibility() {
    const next: ProductVisibility = hidden ? "Đang bán" : "Đã ẩn";
    setVisibility(next);
    setNotice(`${next === "Đã ẩn" ? "Đã ẩn" : "Đã hiển thị lại"} ${product.sku} trong bản demo; thay đổi chưa được lưu vào hệ thống.`);
  }

  return <>
    <AdminPageHeader breadcrumbs={["Sản phẩm", product.name]} title={product.name}
      subtitle={`${product.id} · SKU ${product.sku} · Cập nhật ${product.updatedAt}`}
      actions={<>
        <button type="button" onClick={toggleVisibility} className={`${secondaryButton} min-h-12`}>{hidden ? "Hiện sản phẩm" : "Ẩn sản phẩm"}</button>
        <Link href={`/admin/products/${product.sku}/edit`} className={`${primaryLink} min-h-12 px-8`}>Chỉnh sửa</Link>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <div className="grid gap-6 lg:grid-cols-[416px_minmax(0,1fr)]">
      <section aria-labelledby="product-images" className={`${card} min-w-0 p-6`}>
        <h2 id="product-images" className="text-xl font-semibold">Hình ảnh sản phẩm</h2>
        <ProductImage src={product.image} alt={product.name} sizes="(min-width: 1024px) 368px, 100vw" className="mt-4 aspect-[4/3]" />
        {product.image && <ul className="mt-4 flex gap-4" aria-label="Ảnh sản phẩm">
          <li><ProductImage src={product.image} alt="" sizes="80px" className="h-20 w-20 ring-2 ring-brand" /></li>
        </ul>}
      </section>
      <section aria-labelledby="product-info" className={`${card} min-w-0 p-6`}>
        <h2 id="product-info" className="text-xl font-semibold">Thông tin sản phẩm</h2>
        <div className="mt-4"><StatusBadge status={productStatus({ ...product, visibility })} /></div>
        <div className="mt-2"><DetailList items={[
          { label: "Giá bán", value: formatVnd(product.price) }, { label: "Giá vốn", value: formatVnd(product.cost) },
          { label: "Tồn kho khả dụng", value: `${product.stock} ${unit}` }, { label: "Danh mục", value: categoryPath(product.categoryCode) },
          { label: "Thương hiệu", value: product.brand }, { label: "Đơn vị / Khối lượng", value: `${product.unit} / ${product.weight}` },
          { label: "Người cập nhật", value: product.updatedBy },
        ]} /></div>
      </section>
    </div>

    <TabNav label="Thông tin chi tiết sản phẩm" items={tabs.map((item) => ({ label: item.label, active: tab === item.value, onSelect: () => setTab(item.value) }))} />
    <section aria-label={tabs.find((item) => item.value === tab)?.label} className={`${card} p-6`}>
      {tab === "description" && <>
        <h2 className="text-xl font-semibold">{product.descriptionTitle}</h2>
        <p className="mt-4 leading-relaxed">{product.description}</p>
        {product.ingredients && <p className="mt-4 leading-relaxed text-muted">{product.ingredients}</p>}
      </>}
      {tab === "extra" && <DetailList items={[
        { label: "Mã sản phẩm", value: product.id }, { label: "Loài thú cưng", value: product.petType },
        { label: "Ngưỡng cảnh báo tồn kho", value: `${product.threshold} ${unit}` },
        { label: "Đã phát sinh đơn hàng", value: product.hasOrders ? "Có" : "Chưa" },
      ]} />}
      {tab === "history" && <ul className="divide-y divide-line">
        <li className="py-3"><p className="font-semibold">Cập nhật thông tin sản phẩm</p><p className="mt-1 text-xs text-muted">{product.updatedAt} · {product.updatedBy}</p></li>
        {history.map((entry) => <li key={entry.id} className="py-3">
          <p className="font-semibold">{entry.type} {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity} {unit} · {entry.id}</p>
          <p className="mt-1 text-xs text-muted">{entry.date} · {entry.performer} · {entry.note}</p>
        </li>)}
      </ul>}
    </section>
  </>;
}
