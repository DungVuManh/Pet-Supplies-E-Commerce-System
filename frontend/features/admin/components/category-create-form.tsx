"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { InfoCallout, card, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useCategoryCreate } from "../hooks/use-category-create";
import { AdminPageHeader } from "./admin-ui";
import { CategoryFormFields } from "./category-form-fields";

export function CategoryCreateForm() {
  const { values, errors, formError, pending, set, submit } = useCategoryCreate();

  return <>
    <AdminPageHeader breadcrumbs={["Danh mục", "Thêm danh mục"]} title="Thêm danh mục" subtitle="Danh mục mới xuất hiện ở cửa hàng khi ở trạng thái hiển thị."
      actions={<>
        <Link href="/admin/categories" className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="category-create-form" disabled={pending} className={`${primaryLink} min-h-12 px-8 disabled:opacity-60`}>{pending ? "Đang tạo…" : "Tạo danh mục"}</button>
      </>} />
    {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="category-create-form" noValidate onSubmit={submit} aria-busy={pending} aria-labelledby="category-form-title" className={`${card} min-w-0 p-6`}>
        <h2 id="category-form-title" className="text-xl font-semibold">Thông tin danh mục</h2>
        <CategoryFormFields values={values} errors={errors} set={set} code="Tự động cấp khi lưu"
          slugHint="Tự tạo từ tên danh mục; bạn có thể sửa lại." orderHint="Để trống để xếp sau danh mục cuối cùng." />
      </form>

      <aside className="min-w-0" aria-label="Lưu ý khi tạo danh mục">
        <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Sau khi tạo">
          Gắn sản phẩm vào danh mục tại trang chỉnh sửa sản phẩm. Tên và đường dẫn không được trùng với danh mục khác.
        </InfoCallout>
      </aside>
    </div>
  </>;
}
