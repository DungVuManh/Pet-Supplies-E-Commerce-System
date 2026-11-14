"use client";

import Link from "next/link";
import { TextField } from "@/components/ui/text-field";
import { card, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useProductEdit } from "../hooks/use-product-edit";
import { productStatusLabels } from "../status";
import type { AdminProductDetail } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminPageHeader } from "./admin-ui";
import { ProductBasicSection, SelectField, UnitSelect } from "./product-form-fields";
import { ProductImagesField } from "./product-images-field";

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
        <ProductBasicSection values={values} errors={errors} set={set} toggleCategory={toggleCategory} options={options} categories={categories}
          saved={{ brand: product.brand, petType: product.petType }}
          skuField={<TextField id="product-sku" label="SKU" required autoCapitalize="characters" maxLength={100} value={values.sku} error={errors.sku} hint={product.hasOrders ? "Sản phẩm đã có đơn hàng nên không thể đổi SKU." : undefined} disabled={product.hasOrders} onChange={(e) => set("sku", e.target.value.toUpperCase())} />} />
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
            <UnitSelect value={values.unit} error={errors.unit} units={options.units} saved={product.unit} onChange={(v) => set("unit", v)} />
            <TextField id="product-threshold" label="Ngưỡng cảnh báo" inputMode="numeric" value={values.threshold} error={errors.threshold}
              hint={`Để trống để dùng mặc định của hệ thống${product.ownThreshold === null ? ` (${product.threshold})` : ""}.`} onChange={(e) => set("threshold", e.target.value)} />
          </div>
        </section>
      </form>

      <aside className="min-w-0 space-y-6" aria-label="Hình ảnh và hiển thị">
        <section aria-labelledby="product-photo" className={`${card} p-6`}>
          <h2 id="product-photo" className="text-xl font-semibold">Hình ảnh</h2>
          <ProductImagesField images={values.images} onChange={(images) => set("images", images)} name={values.name} error={errors.images} />
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
