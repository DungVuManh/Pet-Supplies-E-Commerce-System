"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Upload } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { card, control, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useProductEdit } from "../hooks/use-product-edit";
import { petTypeLabels, productStatusLabels } from "../status";
import type { AdminProductDetail } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminPageHeader } from "./admin-ui";
import { ProductImage } from "./product-image";

const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;
const petTypes = ["dog", "cat", "all"];

function SelectField({ id, label, required, error, value, onChange, children }: { id: string; label: string; required?: boolean; error?: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium">{label}{required && <span aria-hidden="true"> *</span>}</label>
    <select id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
      className={`${control} ${error ? "border-danger" : ""}`} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
  </div>;
}

/** The current value stays selectable when it is not in the master data list, such as before `seed:admin` runs. */
function optionNames(names: string[], current: string) {
  return current && !names.includes(current) ? [current, ...names] : names;
}

export function ProductEditForm({ product: initialProduct }: { product: AdminProductDetail }) {
  const { product, values, errors, notice, formError, pending, options, categories, set, toggleCategory, formatOnBlur, submit, deleteOpen, deletePending, deleteError, askDelete, cancelDelete, confirmDelete } = useProductEdit(initialProduct);
  const unit = values.unit.toLowerCase();

  return <>
    <AdminPageHeader breadcrumbs={["Sản phẩm", "Chỉnh sửa sản phẩm"]} title="Chỉnh sửa sản phẩm" subtitle={`${product.code} · ${product.name}`}
      actions={<>
        <Link href={`/admin/products/${encodeURIComponent(product.sku)}`} className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="product-edit-form" disabled={pending} className={`${primaryLink} min-h-12 px-8 disabled:opacity-60`}>{pending ? "Đang lưu…" : "Lưu sản phẩm"}</button>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}
    {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="product-edit-form" noValidate onSubmit={submit} aria-busy={pending} className="min-w-0 space-y-6" aria-label="Chỉnh sửa sản phẩm">
        <section aria-labelledby="basic-info" className={`${card} p-6`}>
          <h2 id="basic-info" className="text-xl font-semibold">Thông tin cơ bản</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><TextField id="product-name" label="Tên sản phẩm" required maxLength={200} value={values.name} error={errors.name} onChange={(e) => set("name", e.target.value)} /></div>
            <TextField id="product-sku" label="SKU" required autoCapitalize="characters" maxLength={100} value={values.sku} error={errors.sku} hint={product.hasOrders ? "Sản phẩm đã có đơn hàng nên không thể đổi SKU." : undefined} disabled={product.hasOrders} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
            <SelectField id="product-brand" label="Thương hiệu" error={errors.brand} value={values.brand} onChange={(v) => set("brand", v)}>
              <option value="">Chưa chọn</option>
              {optionNames(options.brands.map((item) => item.name), product.brand).map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </SelectField>
            <fieldset id="product-categoryCodes" tabIndex={-1} className="min-w-0 sm:col-span-2" aria-describedby={errors.categoryCodes ? "product-categoryCodes-error" : undefined}>
              <legend className="text-sm font-medium">Danh mục<span aria-hidden="true"> *</span></legend>
              {/* Ticked boxes can be scrolled out of view, so the choice is also spelled out. */}
              {categories.length > 0 && <p className="mt-2 text-sm text-muted">Đã chọn: {categories.filter((category) => values.categoryCodes.includes(category.ref)).map((category) => category.name).join(", ") || "chưa có"}</p>}
              <div className={`mt-2 max-h-60 overflow-y-auto rounded-lg border p-3 ${errors.categoryCodes ? "border-danger" : "border-line"}`}>
                {categories.length === 0 && <p className="text-sm text-muted">Đang tải danh mục…</p>}
                <ul className="grid gap-1 sm:grid-cols-2">{categories.map((category) => <li key={category.id}>
                  <label className={`flex min-h-10 items-center gap-3 text-sm ${category.isChild ? "pl-6" : "font-medium"}`}>
                    <input type="checkbox" className="size-5 shrink-0 accent-brand" checked={values.categoryCodes.includes(category.ref)} onChange={() => toggleCategory(category.ref)} />
                    <span className="min-w-0">{category.name}</span>
                  </label>
                </li>)}</ul>
              </div>
              {errors.categoryCodes && <p id="product-categoryCodes-error" role="alert" className="mt-2 text-xs text-danger">{errors.categoryCodes}</p>}
            </fieldset>
            <SelectField id="product-petType" label="Loài thú cưng" error={errors.petType} value={values.petType} onChange={(v) => set("petType", v)}>
              {optionNames(petTypes, product.petType).map((pet) => <option key={pet} value={pet}>{petTypeLabels[pet] ?? pet}</option>)}
            </SelectField>
            <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
              <label htmlFor="product-description" className="text-sm font-medium">Mô tả sản phẩm</label>
              <textarea id="product-description" maxLength={20000} className={textarea} value={values.description} onChange={(e) => set("description", e.target.value)}
                aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "product-description-error" : undefined} />
              {errors.description && <p id="product-description-error" role="alert" className="text-xs text-danger">{errors.description}</p>}
            </div>
          </div>
        </section>
        <section aria-labelledby="price-stock" className={`${card} p-6`}>
          <h2 id="price-stock" className="text-xl font-semibold">Giá bán &amp; tồn kho</h2>
          <p className="mt-2 text-sm text-muted">Áp dụng cho phân loại {product.label} (SKU {product.sku}). Các thông tin khác áp dụng cho mọi phân loại của sản phẩm.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <TextField id="product-price" label="Giá bán (VND)" required inputMode="numeric" value={values.price} error={errors.price} onChange={(e) => set("price", e.target.value)} onBlur={() => formatOnBlur("price")} />
            <TextField id="product-cost" label="Giá vốn (VND)" inputMode="numeric" value={values.cost} error={errors.cost} onChange={(e) => set("cost", e.target.value)} onBlur={() => formatOnBlur("cost")} />
            <TextField id="product-stock" label={unit ? `Tồn kho (${unit})` : "Tồn kho"} required inputMode="numeric" value={values.stock} error={errors.stock}
              hint={product.reservedStock > 0 ? `Đang giữ cho đơn hàng: ${product.reservedStock.toLocaleString("vi-VN")}` : undefined} onChange={(e) => set("stock", e.target.value)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SelectField id="product-unit" label="Đơn vị" error={errors.unit} value={values.unit} onChange={(v) => set("unit", v)}>
              <option value="">Chưa chọn</option>
              {optionNames(options.units.map((item) => item.name), product.unit).map((option) => <option key={option} value={option}>{option}</option>)}
            </SelectField>
            <TextField id="product-threshold" label="Ngưỡng cảnh báo" inputMode="numeric" value={values.threshold} error={errors.threshold}
              hint={`Để trống để dùng mặc định của hệ thống${product.ownThreshold === null ? ` (${product.threshold})` : ""}.`} onChange={(e) => set("threshold", e.target.value)} />
          </div>
        </section>
      </form>

      <aside className="min-w-0 space-y-6" aria-label="Hình ảnh và hiển thị">
        <section aria-labelledby="product-photo" className={`${card} p-6`}>
          <h2 id="product-photo" className="text-xl font-semibold">Hình ảnh</h2>
          <ProductImage src={product.images[0]} alt={product.name} sizes="272px" className="mt-4 aspect-[17/12]" />
          <DemoNotice label="Tải ảnh lên" icon={<Upload className="h-4 w-4" aria-hidden="true" />} className="mt-4 [&>button]:w-full" message="Tải ảnh lên chưa kết nối backend; ảnh hiện tại được giữ nguyên." />
          <p className="mt-4 text-xs text-muted">JPG, PNG · Tối đa 5 MB mỗi ảnh. Ảnh đầu tiên là ảnh đại diện.</p>
        </section>
        <section aria-labelledby="product-visibility" className={`${card} space-y-4 p-6`}>
          <h2 id="product-visibility" className="text-xl font-semibold">Hiển thị</h2>
          <SelectField id="product-visibility-status" label="Trạng thái" error={errors.visibility} value={values.visibility} onChange={(v) => set("visibility", v as "active" | "hidden")}>
            <option value="active">{productStatusLabels.active}</option><option value="hidden">{productStatusLabels.hidden}</option>
          </SelectField>
          <button type="button" className={`${secondaryButton} min-h-12 w-full`} disabled={values.visibility === "hidden"} onClick={() => set("visibility", "hidden")}>
            {values.visibility === "hidden" ? "Sản phẩm đang ẩn" : "Ẩn sản phẩm"}
          </button>
          <button type="button" className={`${dangerButton} min-h-12 w-full`} onClick={askDelete}>Xóa sản phẩm</button>
          <p className="text-xs text-muted">Không thể xóa sản phẩm đã có đơn hàng. Hãy ẩn để ngừng bán.</p>
        </section>
      </aside>
    </div>

    <AdminConfirmDialog open={deleteOpen} danger pending={deletePending} error={deleteError} onConfirm={confirmDelete} onClose={cancelDelete}
      title="Xóa sản phẩm?" confirmLabel="Xóa sản phẩm"
      description={`“${product.name}” và mọi phân loại của sản phẩm sẽ bị xóa vĩnh viễn. Sản phẩm đã có đơn hàng sẽ không thể xóa.`} />
  </>;
}
