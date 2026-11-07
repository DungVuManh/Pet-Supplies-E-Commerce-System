"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { DetailList, InfoCallout, card, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDate } from "@/lib/format";
import { useCategoryEdit } from "../hooks/use-category-edit";
import type { AdminCategoryDetail } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminPageHeader } from "./admin-ui";
import { CategoryFormFields } from "./category-form-fields";

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
        <CategoryFormFields values={values} errors={errors} set={set} code={category.code ?? "Chưa có mã"} slugHint="Đổi đường dẫn sẽ đổi liên kết công khai của danh mục." />
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
