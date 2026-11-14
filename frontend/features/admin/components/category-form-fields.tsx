"use client";

import { TextField } from "@/components/ui/text-field";
import { control } from "@/components/workspace/workspace-ui";
import type { CategoryValues } from "../hooks/use-category-edit";
import { categoryPetTypeLabels, categoryStatusLabels } from "../status";
import type { CategoryPetType, CategoryStatus } from "../types";

const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;
const petTypes: CategoryPetType[] = ["both", "dog", "cat"];

type CategoryFormFieldsProps = {
  values: CategoryValues;
  errors: Partial<Record<keyof CategoryValues, string>>;
  set: <K extends keyof CategoryValues>(key: K, value: CategoryValues[K]) => void;
  /** What the read-only code field shows. */
  code: string;
  slugHint: string;
  orderHint?: string;
};

/** The fields the new and edit category pages share. Field ids are `category-<name>`. */
export function CategoryFormFields({ values, errors, set, code, slugHint, orderHint }: CategoryFormFieldsProps) {
  return <div className="mt-4 grid gap-4 sm:grid-cols-2">
    <TextField id="category-name" label="Tên danh mục" required maxLength={100} value={values.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
    <TextField id="category-code" label="Mã danh mục" value={code} disabled readOnly />
    <div className="sm:col-span-2"><TextField id="category-slug" label="Đường dẫn" required maxLength={120} value={values.slug} error={errors.slug} hint={slugHint} onChange={(e) => set("slug", e.target.value)} /></div>
    <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
      <label htmlFor="category-description" className="text-sm font-medium">Mô tả</label>
      <textarea id="category-description" maxLength={500} className={textarea} value={values.description} onChange={(e) => set("description", e.target.value)}
        aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "category-description-error" : undefined} />
      {errors.description && <p id="category-description-error" role="alert" className="text-xs text-danger">{errors.description}</p>}
    </div>
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor="category-petType" className="text-sm font-medium">Loài thú cưng</label>
      <select id="category-petType" className={control} value={values.petType} onChange={(e) => set("petType", e.target.value as CategoryPetType)} aria-describedby="category-petType-hint">
        {petTypes.map((pet) => <option key={pet} value={pet}>{categoryPetTypeLabels[pet]}</option>)}
      </select>
      <p id="category-petType-hint" className="text-xs text-muted">Cửa hàng hiện danh mục khi khách lọc theo loài này.</p>
    </div>
    <TextField id="category-order" label="Thứ tự hiển thị" inputMode="numeric" value={values.order} error={errors.order} hint={orderHint} onChange={(e) => set("order", e.target.value)} />
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor="category-status" className="text-sm font-medium">Trạng thái</label>
      <select id="category-status" className={control} value={values.status} onChange={(e) => set("status", e.target.value as CategoryStatus)}>
        <option value="active">{categoryStatusLabels.active}</option><option value="hidden">{categoryStatusLabels.hidden}</option>
      </select>
    </div>
  </div>;
}
