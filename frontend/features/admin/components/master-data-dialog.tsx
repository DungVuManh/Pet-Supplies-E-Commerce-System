"use client";

import { TextField } from "@/components/ui/text-field";
import { control, dangerButton } from "@/components/workspace/workspace-ui";
import type { useMasterDataForm } from "../hooks/use-master-data-form";
import { masterDataStatusLabels } from "../status";
import type { MasterDataKind, MasterDataStatus } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";

type Form = ReturnType<typeof useMasterDataForm>;

/** Labels per tab. `notice` explains what the data does not reach yet. */
const kinds: Record<MasterDataKind, { noun: string; name: string; description: string; notice?: string }> = {
  petType: {
    noun: "loài thú cưng", name: "Tên loài", description: "Mô tả",
    notice: "Loài mới chưa xuất hiện trong biểu mẫu sản phẩm và bộ lọc cửa hàng, vốn chỉ dùng Chó và Mèo.",
  },
  breed: { noun: "giống", name: "Tên giống", description: "Mô tả" },
  brand: { noun: "thương hiệu", name: "Tên thương hiệu", description: "Xuất xứ" },
  unit: { noun: "đơn vị", name: "Tên đơn vị", description: "Cách dùng" },
  shippingMethod: {
    noun: "phương thức vận chuyển", name: "Tên phương thức", description: "Mô tả",
    notice: "Phương thức mới chưa áp dụng cho trang thanh toán; phí giao hàng do đơn vị vận chuyển tính.",
  },
};

const textarea = `${control} h-auto min-h-24 py-3 leading-relaxed`;

/** Adds, edits, and deletes one master data row of the current tab. Field ids are `master-<name>`. */
export function MasterDataDialog({ kind, form }: { kind: MasterDataKind; form: Form }) {
  const { open, creating, loading, row, values, errors, formError, pending, petTypeOptions, confirmingDelete, close, set, submit, askDelete, cancelDelete, confirmDelete } = form;
  const labels = kinds[kind];
  const description = creating
    ? `Mã được tạo tự động từ tên và không đổi sau khi lưu.${labels.notice ? ` ${labels.notice}` : ""}`
    : loading ? "Đang tải dữ liệu…" : `Mã ${row?.code ?? ""} không thể thay đổi.${labels.notice ? ` ${labels.notice}` : ""}`;

  return <>
    <AdminConfirmDialog open={open && !confirmingDelete} pending={pending} error={formError} onConfirm={() => void submit()} onClose={close}
      title={creating ? `Thêm ${labels.noun}` : `Sửa ${labels.noun}`} confirmLabel={creating ? "Thêm" : "Lưu thay đổi"} description={description}>
      {!loading && <div className="space-y-4">
        {kind === "breed" && <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="master-petTypeCode" className="text-sm font-medium">Loài thú cưng<span aria-hidden="true"> *</span></label>
          <select id="master-petTypeCode" className={`${control} ${errors.petTypeCode ? "border-danger" : ""}`} value={values.petTypeCode} onChange={(e) => set("petTypeCode", e.target.value)}
            aria-invalid={Boolean(errors.petTypeCode)} aria-describedby={errors.petTypeCode ? "master-petTypeCode-error" : undefined}>
            <option value="">Chọn loài</option>
            {petTypeOptions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
          {errors.petTypeCode && <p id="master-petTypeCode-error" role="alert" className="text-xs text-danger">{errors.petTypeCode}</p>}
        </div>}
        <TextField id="master-name" label={labels.name} required maxLength={100} value={values.name} error={errors.name}
          disabled={Boolean(row?.renameBlocked)} hint={row?.renameBlocked ? `Không thể đổi tên: ${row.renameBlocked}.` : undefined} onChange={(e) => set("name", e.target.value)} />
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="master-description" className="text-sm font-medium">{labels.description}</label>
          <textarea id="master-description" maxLength={300} className={textarea} value={values.description} onChange={(e) => set("description", e.target.value)}
            aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "master-description-error" : undefined} />
          {errors.description && <p id="master-description-error" role="alert" className="text-xs text-danger">{errors.description}</p>}
        </div>
        {kind === "shippingMethod" && <TextField id="master-fee" label="Phí (VND)" required inputMode="numeric" value={values.fee} error={errors.fee} onChange={(e) => set("fee", e.target.value)} />}
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="master-status" className="text-sm font-medium">Trạng thái</label>
          <select id="master-status" className={control} value={values.status} onChange={(e) => set("status", e.target.value as MasterDataStatus)}>
            <option value="active">{masterDataStatusLabels.active}</option><option value="inactive">{masterDataStatusLabels.inactive}</option>
          </select>
        </div>
        {row && <div className="border-t border-line pt-4">
          <button type="button" className={`${dangerButton} min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-50`} disabled={Boolean(row.blocker)} onClick={askDelete}>Xóa {labels.noun}</button>
          {row.blocker && <p className="mt-2 text-xs text-muted">Không thể xóa: {row.blocker}. Hãy chuyển sang {masterDataStatusLabels.inactive.toLowerCase()}.</p>}
        </div>}
      </div>}
    </AdminConfirmDialog>

    <AdminConfirmDialog open={open && confirmingDelete} danger pending={pending} onConfirm={() => void confirmDelete()} onClose={cancelDelete}
      title={`Xóa ${labels.noun}?`} confirmLabel={`Xóa ${labels.noun}`}
      description={`“${row?.name ?? ""}” (${row?.code ?? ""}) sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`} />
  </>;
}
