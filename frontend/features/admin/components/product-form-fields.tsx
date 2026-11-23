"use client";

import type { ReactNode } from "react";
import { TextField } from "@/components/ui/text-field";
import { card, control } from "@/components/workspace/workspace-ui";
import { petTypeLabels } from "../status";
import type { AdminCategoryRow, ProductOptions } from "../types";

const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;
const petTypes = ["dog", "cat", "all"];

/** The product-level values both product forms edit. */
export type ProductBasicValues = { name: string; brand: string; petType: string; description: string; components: string; unit: string; categoryCodes: string[] };

export function SelectField({ id, label, required, error, value, onChange, children }: { id: string; label: string; required?: boolean; error?: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium">{label}{required && <span aria-hidden="true"> *</span>}</label>
    <select id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
      className={`${control} ${error ? "border-danger" : ""}`} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
  </div>;
}

/** The current value stays selectable when it is not in the master data list, such as before `seed:admin` runs. */
export function optionNames(names: string[], current: string) {
  return current && !names.includes(current) ? [current, ...names] : names;
}

type BasicSectionProps<V extends ProductBasicValues> = {
  values: V;
  errors: Partial<Record<keyof ProductBasicValues, string>>;
  /** The form's own setter; its values may hold more fields than this section edits. */
  set: <K extends keyof V>(key: K, value: V[K]) => void;
  toggleCategory: (ref: string) => void;
  options: ProductOptions;
  categories: AdminCategoryRow[];
  /** Saved values that stay selectable even when the master data list lacks them. */
  saved?: { brand: string; petType: string };
  /** The edit page's SKU field, shown next to the brand. */
  skuField?: ReactNode;
};

/** "Thông tin cơ bản": the fields that apply to every variant. Field ids are `product-<name>`. */
export function ProductBasicSection<V extends ProductBasicValues>({ values, errors, set: setValue, toggleCategory, options, categories, saved = { brand: "", petType: "" }, skuField }: BasicSectionProps<V>) {
  // Every field set here is a string field of `ProductBasicValues`, which `V` extends.
  const set = (key: keyof ProductBasicValues & keyof V, value: string) => setValue(key, value as V[typeof key]);
  return <section aria-labelledby="basic-info" className={`${card} p-6`}>
    <h2 id="basic-info" className="text-xl font-semibold">Thông tin cơ bản</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><TextField id="product-name" label="Tên sản phẩm" required maxLength={200} value={values.name} error={errors.name} onChange={(e) => set("name", e.target.value)} /></div>
      {skuField}
      <SelectField id="product-brand" label="Thương hiệu" error={errors.brand} value={values.brand} onChange={(v) => set("brand", v)}>
        <option value="">Chưa chọn</option>
        {optionNames(options.brands.map((item) => item.name), saved.brand).map((brand) => <option key={brand} value={brand}>{brand}</option>)}
      </SelectField>
      <fieldset id="product-categoryCodes" tabIndex={-1} className="min-w-0 sm:col-span-2" aria-describedby={errors.categoryCodes ? "product-categoryCodes-error" : undefined}>
        <legend className="text-sm font-medium">Danh mục<span aria-hidden="true"> *</span></legend>
        {/* Ticked boxes can be scrolled out of view, so the choice is also spelled out. */}
        {categories.length > 0 && <p className="mt-2 text-sm text-muted">Đã chọn: {categories.filter((category) => values.categoryCodes.includes(category.ref)).map((category) => category.name).join(", ") || "chưa có"}</p>}
        <div className={`mt-2 max-h-60 overflow-y-auto rounded-lg border p-3 ${errors.categoryCodes ? "border-danger" : "border-line"}`}>
          {categories.length === 0 && <p className="text-sm text-muted">Đang tải danh mục…</p>}
          <ul className="grid gap-1 sm:grid-cols-2">{categories.map((category) => <li key={category.id}>
            <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="size-5 shrink-0 accent-brand" checked={values.categoryCodes.includes(category.ref)} onChange={() => toggleCategory(category.ref)} />
              <span className="min-w-0">{category.name}</span>
            </label>
          </li>)}</ul>
        </div>
        {errors.categoryCodes && <p id="product-categoryCodes-error" role="alert" className="mt-2 text-xs text-danger">{errors.categoryCodes}</p>}
      </fieldset>
      <SelectField id="product-petType" label="Loài thú cưng" error={errors.petType} value={values.petType} onChange={(v) => set("petType", v)}>
        {optionNames(petTypes, saved.petType).map((pet) => <option key={pet} value={pet}>{petTypeLabels[pet] ?? pet}</option>)}
      </SelectField>
      <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
        <label htmlFor="product-description" className="text-sm font-medium">Mô tả sản phẩm</label>
        <textarea id="product-description" maxLength={20000} className={textarea} value={values.description} onChange={(e) => set("description", e.target.value)}
          aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "product-description-error" : undefined} />
        {errors.description && <p id="product-description-error" role="alert" className="text-xs text-danger">{errors.description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
        <label htmlFor="product-components" className="text-sm font-medium">Thành phần &amp; hướng dẫn</label>
        <textarea id="product-components" maxLength={20000} className={textarea} value={values.components} onChange={(e) => set("components", e.target.value)}
          aria-invalid={Boolean(errors.components)} aria-describedby={errors.components ? "product-components-error" : undefined} />
        {errors.components && <p id="product-components-error" role="alert" className="text-xs text-danger">{errors.components}</p>}
      </div>
    </div>
  </section>;
}

/** The unit select; the edit page shows it with price and stock, the new page with the variants. */
export function UnitSelect({ value, error, units, saved = "", onChange }: { value: string; error?: string; units: ProductOptions["units"]; saved?: string; onChange: (value: string) => void }) {
  return <SelectField id="product-unit" label="Đơn vị" error={error} value={value} onChange={onChange}>
    <option value="">Chưa chọn</option>
    {optionNames(units.map((item) => item.name), saved).map((option) => <option key={option} value={option}>{option}</option>)}
  </SelectField>;
}
