"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { DetailList, InfoCallout, card, control, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDate } from "@/lib/format";
import { useCategoryEdit } from "../hooks/use-category-edit";
import { categoryStatusLabels } from "../status";
import type { AdminCategoryDetail, CategoryStatus } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminPageHeader } from "./admin-ui";

const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;

export function CategoryEditForm({ category: initialCategory }: { category: AdminCategoryDetail }) {
  const { category, values, errors, notice, formError, pending, set, submit, deleteOpen, deletePending, deleteError, askDelete, cancelDelete, confirmDelete } = useCategoryEdit(initialCategory);

  return <>
    <AdminPageHeader breadcrumbs={["Danh mục", "Chỉnh sửa danh mục"]} title="Chỉnh sửa danh mục" subtitle={`${category.code ?? "Chưa có mã"} · ${category.name}`}
      actions={<>
        <Link href="/admin/categories" className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="category-edit-form" disabled={pending} className={`${primaryLink} min-h-12 px-8 disabled:opacity-60`}>{pending ? "Đang lưu…" : "Lưu danh mục"}</button>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}
    {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="category-edit-form" noValidate onSubmit={submit} aria-busy={pending} aria-labelledby="category-form-title" className={`${card} min-w-0 p-6`}>
        <h2 id="category-form-title" className="text-xl font-semibold">Thông tin danh mục</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="category-name" label="Tên danh mục" required maxLength={100} value={values.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
          <TextField id="category-code" label="Mã danh mục" value={category.code ?? "Chưa có mã"} disabled readOnly />
          <div className="sm:col-span-2"><TextField id="category-slug" label="Đường dẫn" maxLength={120} value={values.slug} error={errors.slug} hint="Đổi đường dẫn sẽ đổi liên kết công khai của danh mục." onChange={(e) => set("slug", e.target.value)} /></div>
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <label htmlFor="category-description" className="text-sm font-medium">Mô tả</label>
            <textarea id="category-description" maxLength={500} className={textarea} value={values.description} onChange={(e) => set("description", e.target.value)}
              aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "category-description-error" : undefined} />
            {errors.description && <p id="category-description-error" role="alert" className="text-xs text-danger">{errors.description}</p>}
          </div>
          <TextField id="category-order" label="Thứ tự hiển thị" inputMode="numeric" value={values.order} error={errors.order} onChange={(e) => set("order", e.target.value)} />
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="category-status" className="text-sm font-medium">Trạng thái</label>
            <select id="category-status" className={control} value={values.status} onChange={(e) => set("status", e.target.value as CategoryStatus)}>
              <option value="active">{categoryStatusLabels.active}</option><option value="hidden">{categoryStatusLabels.hidden}</option>
            </select>
          </div>
        </div>
      </form>

      <aside className="min-w-0 space-y-6" aria-label="Thông tin liên kết và xóa danh mục">
        <section aria-labelledby="category-links" className={`${card} p-6`}>
          <h2 id="category-links" className="text-xl font-semibold">Thông tin liên kết</h2>
          <div className="mt-4"><DetailList items={[
            { label: "Sản phẩm liên kết", value: `${category.productCount.toLocaleString("vi-VN")} sản phẩm` },
            { label: "Cập nhật gần nhất", value: formatDate(category.updatedAt) },
          ]} /></div>
        </section>
        {category.blocker && <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Không thể xóa danh mục">
          Danh mục {category.blocker}. Chuyển sản phẩm sang danh mục khác trước khi xóa.
        </InfoCallout>}
        <button type="button" className={`${dangerButton} min-h-12 w-full`} onClick={askDelete}>Xóa danh mục</button>
      </aside>
    </div>

    <AdminConfirmDialog open={deleteOpen} danger pending={deletePending} error={deleteError} onConfirm={confirmDelete} onClose={cancelDelete}
      title="Xóa danh mục?" confirmLabel="Xóa danh mục"
      description={`“${category.name}” sẽ bị xóa vĩnh viễn. Danh mục còn sản phẩm sẽ không thể xóa.`} />
  </>;
}
