"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { DemoNotice } from "@/features/workspace/components/demo-notice";
import { card, control, dangerButton, primaryLink, secondaryButton } from "@/features/workspace/components/workspace-ui";
import { categories } from "../mock/categories";
import { petTypeOptions, unitOptions } from "../mock/master-data";
import { brandOptions, type Product, type ProductVisibility } from "../mock/products";
import { parseAmount, validateProduct, type ProductFormValues } from "../validation";
import { AdminPageHeader } from "./admin-ui";
import { ProductImage } from "./product-image";

type Values = ProductFormValues & { brand: string; petType: string; description: string; unit: string; visibility: ProductVisibility };

const amount = (value: number) => value.toLocaleString("vi-VN");
const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;

function SelectField({ id, label, required, error, value, onChange, children }: { id: string; label: string; required?: boolean; error?: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium">{label}{required && <span aria-hidden="true"> *</span>}</label>
    <select id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
      className={`${control} ${error ? "border-danger" : ""}`} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
  </div>;
}

export function ProductEditForm({ product }: { product: Product }) {
  const initial: Values = {
    name: product.name, sku: product.sku, categoryCode: product.categoryCode, brand: product.brand, petType: product.petType, description: product.description,
    price: amount(product.price), cost: amount(product.cost), stock: String(product.stock), unit: product.unit, threshold: String(product.threshold), visibility: product.visibility,
  };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");
  const errors = submitted ? validateProduct(values) : {};
  const dirty = (Object.keys(values) as (keyof Values)[]).some((key) => values[key] !== saved[key]);
  const unit = values.unit.toLowerCase();

  function set<K extends keyof Values>(key: K, value: Values[K]) { setValues((current) => ({ ...current, [key]: value })); setNotice(""); }
  /** Shows money as "450.000" once the field loses focus; invalid text is left for the error message. */
  function formatOnBlur(key: "price" | "cost") { const parsed = parseAmount(values[key]); if (!Number.isNaN(parsed)) set(key, amount(parsed)); }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const first = Object.keys(validateProduct(values))[0];
    if (first) { document.getElementById(`product-${first}`)?.focus(); return; }
    if (!dirty) { setNotice("Không có thay đổi nào để lưu."); return; }
    setSaved(values);
    setNotice("Đã lưu sản phẩm trong bản demo; dữ liệu chưa được gửi đến hệ thống.");
  }

  function remove() {
    setNotice(product.hasOrders
      ? `Không thể xóa ${product.sku} vì sản phẩm đã có đơn hàng. Hãy ẩn sản phẩm để ngừng bán.`
      : `Xóa ${product.sku} chưa kết nối backend; sản phẩm vẫn còn trong danh sách.`);
  }

  return <>
    <AdminPageHeader breadcrumbs={["Sản phẩm", "Chỉnh sửa sản phẩm"]} title="Chỉnh sửa sản phẩm" subtitle={`${product.id} · ${product.name}`}
      actions={<>
        <Link href={`/admin/products/${product.sku}`} className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="product-edit-form" className={`${primaryLink} min-h-12 px-8`}>Lưu sản phẩm</button>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="product-edit-form" noValidate onSubmit={submit} className="min-w-0 space-y-6" aria-label="Chỉnh sửa sản phẩm">
        <section aria-labelledby="basic-info" className={`${card} p-6`}>
          <h2 id="basic-info" className="text-xl font-semibold">Thông tin cơ bản</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><TextField id="product-name" label="Tên sản phẩm" required value={values.name} error={errors.name} onChange={(e) => set("name", e.target.value)} /></div>
            <TextField id="product-sku" label="SKU" required autoCapitalize="characters" value={values.sku} error={errors.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
            <SelectField id="product-brand" label="Thương hiệu" value={values.brand} onChange={(v) => set("brand", v)}>
              {brandOptions.map((brand) => <option key={brand}>{brand}</option>)}
            </SelectField>
            <SelectField id="product-categoryCode" label="Danh mục" required error={errors.categoryCode} value={values.categoryCode} onChange={(v) => set("categoryCode", v)}>
              <option value="">Chọn danh mục</option>
              {categories.filter((category) => category.parent || !categories.some((child) => child.parent === category.code)).map((category) => {
                const parent = categories.find((item) => item.code === category.parent);
                return <option key={category.code} value={category.code}>{parent ? `${parent.name} / ${category.name}` : category.name}</option>;
              })}
            </SelectField>
            <SelectField id="product-petType" label="Loài thú cưng" value={values.petType} onChange={(v) => set("petType", v)}>
              {petTypeOptions.map((pet) => <option key={pet}>{pet}</option>)}
            </SelectField>
            <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
              <label htmlFor="product-description" className="text-sm font-medium">Mô tả sản phẩm</label>
              <textarea id="product-description" className={textarea} value={values.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>
        </section>
        <section aria-labelledby="price-stock" className={`${card} p-6`}>
          <h2 id="price-stock" className="text-xl font-semibold">Giá bán &amp; tồn kho</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <TextField id="product-price" label="Giá bán (VND)" required inputMode="numeric" value={values.price} error={errors.price} onChange={(e) => set("price", e.target.value)} onBlur={() => formatOnBlur("price")} />
            <TextField id="product-cost" label="Giá vốn (VND)" inputMode="numeric" value={values.cost} error={errors.cost} onChange={(e) => set("cost", e.target.value)} onBlur={() => formatOnBlur("cost")} />
            <TextField id="product-stock" label={`Tồn kho (${unit})`} required inputMode="numeric" value={values.stock} error={errors.stock} onChange={(e) => set("stock", e.target.value)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SelectField id="product-unit" label="Đơn vị" value={values.unit} onChange={(v) => set("unit", v)}>
              {unitOptions.map((option) => <option key={option}>{option}</option>)}
            </SelectField>
            <TextField id="product-threshold" label="Ngưỡng cảnh báo" inputMode="numeric" value={values.threshold} error={errors.threshold} onChange={(e) => set("threshold", e.target.value)} />
          </div>
        </section>
      </form>

      <aside className="min-w-0 space-y-6" aria-label="Hình ảnh và hiển thị">
        <section aria-labelledby="product-photo" className={`${card} p-6`}>
          <h2 id="product-photo" className="text-xl font-semibold">Hình ảnh</h2>
          <ProductImage src={product.image} alt={product.name} sizes="272px" className="mt-4 aspect-[17/12]" />
          <DemoNotice label="Tải ảnh lên" icon={<Upload className="h-4 w-4" aria-hidden="true" />} className="mt-4 [&>button]:w-full" message="Tải ảnh lên chưa kết nối backend; ảnh hiện tại được giữ nguyên." />
          <p className="mt-4 text-xs text-muted">JPG, PNG · Tối đa 5 MB mỗi ảnh. Ảnh đầu tiên là ảnh đại diện.</p>
        </section>
        <section aria-labelledby="product-visibility" className={`${card} space-y-4 p-6`}>
          <h2 id="product-visibility" className="text-xl font-semibold">Hiển thị</h2>
          <SelectField id="product-visibility-status" label="Trạng thái" value={values.visibility} onChange={(v) => set("visibility", v as ProductVisibility)}>
            <option value="Đang bán">Đang bán</option><option value="Đã ẩn">Đã ẩn</option>
          </SelectField>
          <button type="button" className={`${secondaryButton} min-h-12 w-full`} disabled={values.visibility === "Đã ẩn"} onClick={() => set("visibility", "Đã ẩn")}>
            {values.visibility === "Đã ẩn" ? "Sản phẩm đang ẩn" : "Ẩn sản phẩm"}
          </button>
          <button type="button" className={`${dangerButton} min-h-12 w-full`} onClick={remove}>Xóa sản phẩm</button>
          <p className="text-xs text-muted">Không thể xóa sản phẩm đã có đơn hàng. Hãy ẩn để ngừng bán.</p>
        </section>
      </aside>
    </div>
  </>;
}
