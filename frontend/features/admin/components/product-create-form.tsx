"use client";

import Link from "next/link";
import { card, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useProductCreate } from "../hooks/use-product-create";
import { productStatusLabels } from "../status";
import { AdminPageHeader } from "./admin-ui";
import { ProductBasicSection, SelectField, UnitSelect } from "./product-form-fields";
import { ProductVariantsField } from "./product-variants-field";

export function ProductCreateForm() {
  const { values, variants, errors, variantErrors, formError, pending, options, categories, set, toggleCategory, setVariant, formatVariantAmount, addVariant, removeVariant, submit } = useProductCreate();

  return <>
    <AdminPageHeader breadcrumbs={["Sản phẩm", "Thêm sản phẩm"]} title="Thêm sản phẩm" subtitle="Mỗi phân loại có SKU, giá và tồn kho riêng."
      actions={<>
        <Link href="/admin/products" className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="product-create-form" disabled={pending} className={`${primaryLink} min-h-12 px-8 disabled:opacity-60`}>{pending ? "Đang tạo…" : "Tạo sản phẩm"}</button>
      </>} />
    {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}

    <form id="product-create-form" noValidate onSubmit={submit} aria-busy={pending} aria-label="Thêm sản phẩm" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <ProductBasicSection values={values} errors={errors} set={set} toggleCategory={toggleCategory} options={options} categories={categories} />
        <section aria-labelledby="variants-title" className={`${card} p-6`}>
          <h2 id="variants-title" className="text-xl font-semibold">Phân loại, giá &amp; tồn kho</h2>
          <div className="mt-4 max-w-sm"><UnitSelect value={values.unit} error={errors.unit} units={options.units} onChange={(v) => set("unit", v)} /></div>
          <ProductVariantsField variants={variants} errors={variantErrors} listError={errors.variants} unit={values.unit}
            setVariant={setVariant} formatAmount={formatVariantAmount} addVariant={addVariant} removeVariant={removeVariant} />
        </section>
      </div>

      <aside className="min-w-0 space-y-6" aria-label="Hiển thị và hình ảnh">
        <section aria-labelledby="product-visibility" className={`${card} space-y-4 p-6`}>
          <h2 id="product-visibility" className="text-xl font-semibold">Hiển thị</h2>
          <SelectField id="product-visibility" label="Trạng thái" error={errors.visibility} value={values.visibility} onChange={(v) => set("visibility", v as "active" | "hidden")}>
            <option value="active">{productStatusLabels.active}</option><option value="hidden">{productStatusLabels.hidden}</option>
          </SelectField>
          <p className="text-xs text-muted">Sản phẩm ẩn không xuất hiện ở cửa hàng cho đến khi bạn hiện lại.</p>
        </section>
        <section aria-labelledby="product-photo" className={`${card} p-6`}>
          <h2 id="product-photo" className="text-xl font-semibold">Hình ảnh</h2>
          <p className="mt-4 text-sm text-muted">Sản phẩm mới chưa có ảnh; cửa hàng hiển thị ảnh mặc định. Tính năng tải ảnh lên đang được phát triển riêng.</p>
        </section>
      </aside>
    </form>
  </>;
}
