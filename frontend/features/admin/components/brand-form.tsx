"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { DetailList, InfoCallout, card, control, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDate } from "@/lib/format";
import { useBrandForm } from "../hooks/use-brand-form";
import { masterDataStatusLabels } from "../status";
import type { MasterDataDetail, MasterDataStatus } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminPageHeader } from "./admin-ui";

const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;

/** The new brand page when `brand` is null, otherwise its edit page. Field ids are `brand-<name>`. */
export function BrandForm({ brand: initialBrand }: { brand: MasterDataDetail | null }) {
  const { brand, values, errors, notice, formError, pending, set, submit, deleteOpen, deletePending, deleteError, askDelete, cancelDelete, confirmDelete } = useBrandForm(initialBrand);
  const editing = brand !== null;
  const title = editing ? "Chỉnh sửa thương hiệu" : "Thêm thương hiệu";

  return <>
    <AdminPageHeader breadcrumbs={["Thương hiệu", title]} title={title} subtitle={editing ? `${brand.code} · ${brand.name}` : "Mã thương hiệu được tạo tự động từ tên."}
      actions={<>
        <Link href="/admin/brands" className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="brand-form" disabled={pending} className={`${primaryLink} min-h-12 px-8 disabled:opacity-60`}>
          {pending ? "Đang lưu…" : editing ? "Lưu thương hiệu" : "Tạo thương hiệu"}
        </button>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}
    {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="brand-form" noValidate onSubmit={submit} aria-busy={pending} aria-labelledby="brand-form-title" className={`${card} min-w-0 p-6`}>
        <h2 id="brand-form-title" className="text-xl font-semibold">Thông tin thương hiệu</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="brand-name" label="Tên thương hiệu" required maxLength={100} value={values.name} error={errors.name}
            disabled={Boolean(brand?.renameBlocked)} hint={brand?.renameBlocked ? `Không thể đổi tên: ${brand.renameBlocked}.` : undefined}
            onChange={(e) => set("name", e.target.value)} />
          <TextField id="brand-code" label="Mã thương hiệu" value={brand?.code ?? "Tự động cấp khi lưu"} disabled readOnly />
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <label htmlFor="brand-description" className="text-sm font-medium">Xuất xứ</label>
            <textarea id="brand-description" maxLength={300} className={textarea} placeholder="Ví dụ: Pháp · Thức ăn theo giống và độ tuổi" value={values.description} onChange={(e) => set("description", e.target.value)}
              aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "brand-description-error" : undefined} />
            {errors.description && <p id="brand-description-error" role="alert" className="text-xs text-danger">{errors.description}</p>}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="brand-status" className="text-sm font-medium">Trạng thái</label>
            <select id="brand-status" className={control} value={values.status} onChange={(e) => set("status", e.target.value as MasterDataStatus)} aria-describedby="brand-status-hint">
              <option value="active">{masterDataStatusLabels.active}</option><option value="inactive">{masterDataStatusLabels.inactive}</option>
            </select>
            <p id="brand-status-hint" className="text-xs text-muted">Thương hiệu {masterDataStatusLabels.inactive.toLowerCase()} không còn trong danh sách chọn khi sửa sản phẩm.</p>
          </div>
        </div>
      </form>

      <aside className="min-w-0 space-y-6" aria-label={editing ? "Thông tin liên kết và xóa thương hiệu" : "Lưu ý"}>
        {editing ? <>
          <section aria-labelledby="brand-links" className={`${card} p-6`}>
            <h2 id="brand-links" className="text-xl font-semibold">Thông tin liên kết</h2>
            <div className="mt-4"><DetailList items={[
              { label: "Sản phẩm dùng thương hiệu", value: `${(brand.productCount ?? 0).toLocaleString("vi-VN")} sản phẩm` },
              { label: "Cập nhật gần nhất", value: formatDate(brand.updatedAt) },
            ]} /></div>
          </section>
          {brand.blocker && <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Không thể xóa thương hiệu">
            Thương hiệu {brand.blocker}. Hãy chuyển sang {masterDataStatusLabels.inactive.toLowerCase()} để ngừng dùng.
          </InfoCallout>}
          <button type="button" className={`${dangerButton} min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-50`} disabled={Boolean(brand.blocker)} onClick={askDelete}>Xóa thương hiệu</button>
        </> : <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Sau khi tạo">
          Chọn thương hiệu cho sản phẩm tại trang thêm hoặc chỉnh sửa sản phẩm. Tên không được trùng với thương hiệu khác.
        </InfoCallout>}
      </aside>
    </div>

    {editing && <AdminConfirmDialog open={deleteOpen} danger pending={deletePending} error={deleteError} onConfirm={confirmDelete} onClose={cancelDelete}
      title="Xóa thương hiệu?" confirmLabel="Xóa thương hiệu"
      description={`“${brand.name}” sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`} />}
  </>;
}
