"use client";

import Link from "next/link";
import { TextField } from "@/components/ui/text-field";
import { DetailList, card, control, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDate, formatVnd } from "@/lib/format";
import { useVoucherForm } from "../hooks/use-voucher-form";
import { voucherStateLabels } from "../status";
import type { AdminVoucherDetail, VoucherType } from "../types";
import { voucherUsageText } from "../voucher";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminPageHeader, StatusBadge } from "./admin-ui";

const LOCKED_HINT = "Đã có đơn hàng sử dụng nên không thể đổi.";

/** Creates a voucher, or edits `voucher` when given. */
export function VoucherForm({ voucher: initialVoucher }: { voucher?: AdminVoucherDetail }) {
  const { voucher, values, errors, notice, formError, pending, preview, set, submit, locked, deleteOpen, deletePending, deleteError, confirmDelete, askDelete, cancelDelete } = useVoucherForm(initialVoucher);
  const title = voucher ? "Chỉnh sửa voucher" : "Thêm voucher";
  const percent = values.type === "percent";

  return <>
    <AdminPageHeader breadcrumbs={["Voucher", title]} title={title} subtitle={voucher ? `${voucher.code}${voucher.name ? ` · ${voucher.name}` : ""}` : "Tạo mã giảm giá mới cho khách hàng."}
      actions={<>
        <Link href="/admin/vouchers" className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="voucher-form" disabled={pending} className={`${primaryLink} min-h-12 px-8 disabled:opacity-60`}>{pending ? "Đang lưu…" : "Lưu voucher"}</button>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}
    {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="voucher-form" noValidate onSubmit={submit} aria-busy={pending} aria-labelledby="voucher-form-title" className={`${card} min-w-0 p-6`}>
        <h2 id="voucher-form-title" className="text-xl font-semibold">Thông tin voucher</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="voucher-code" label="Mã voucher" required maxLength={30} value={values.code} error={errors.code} disabled={locked("code")}
            hint={locked("code") ? LOCKED_HINT : "Chữ không dấu, số hoặc dấu gạch ngang, ví dụ PET50K."} onChange={(e) => set("code", e.target.value.toUpperCase())} />
          <TextField id="voucher-name" label="Tên voucher" required maxLength={100} value={values.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="voucher-type" className="text-sm font-medium">Loại giảm giá</label>
            <select id="voucher-type" className={control} value={values.type} disabled={locked("type")} aria-invalid={Boolean(errors.type)}
              aria-describedby={errors.type ? "voucher-type-error" : locked("type") ? "voucher-type-hint" : undefined} onChange={(e) => set("type", e.target.value as VoucherType)}>
              <option value="percent">Theo phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (₫)</option>
            </select>
            {locked("type") && <p id="voucher-type-hint" className="text-xs text-muted">{LOCKED_HINT}</p>}
            {errors.type && <p id="voucher-type-error" role="alert" className="text-xs text-danger">{errors.type}</p>}
          </div>
          <TextField id="voucher-value" label={percent ? "Giá trị giảm (%)" : "Giá trị giảm (₫)"} required inputMode="numeric" value={values.value} error={errors.value} disabled={locked("value")}
            hint={locked("value") ? LOCKED_HINT : undefined} onChange={(e) => set("value", e.target.value)} />

          {percent && <TextField id="voucher-maxDiscount" label="Giảm tối đa (₫)" inputMode="numeric" value={values.maxDiscount} error={errors.maxDiscount} hint="Để trống nếu không giới hạn." onChange={(e) => set("maxDiscount", e.target.value)} />}
          <TextField id="voucher-minOrderAmount" label="Đơn tối thiểu (₫)" inputMode="numeric" value={values.minOrderAmount} error={errors.minOrderAmount} hint="Để trống nếu áp dụng cho mọi đơn." onChange={(e) => set("minOrderAmount", e.target.value)} />

          <TextField id="voucher-startDate" label="Ngày bắt đầu" required type="date" value={values.startDate} error={errors.startDate} hint="Theo giờ Việt Nam, từ 00:00." onChange={(e) => set("startDate", e.target.value)} />
          <TextField id="voucher-endDate" label="Ngày kết thúc" required type="date" value={values.endDate} error={errors.endDate} hint="Theo giờ Việt Nam, hết 23:59 ngày này." onChange={(e) => set("endDate", e.target.value)} />

          <TextField id="voucher-usageLimit" label="Giới hạn lượt dùng" inputMode="numeric" value={values.usageLimit} error={errors.usageLimit} hint="Để trống nếu không giới hạn." onChange={(e) => set("usageLimit", e.target.value)} />
          <div className="flex min-w-0 flex-col justify-center gap-3 sm:col-span-2">
            <label className="flex min-h-10 items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5 shrink-0 accent-brand" checked={values.oncePerCustomer} onChange={(e) => set("oncePerCustomer", e.target.checked)} />
              Mỗi khách chỉ dùng một lần
            </label>
            <label className="flex min-h-10 items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5 shrink-0 accent-brand" checked={values.isPublic} onChange={(e) => set("isPublic", e.target.checked)} />
              Hiển thị trên cửa hàng
            </label>
          </div>
        </div>
      </form>

      <aside className="min-w-0 space-y-6" aria-label="Xem trước và tình trạng voucher">
        <section aria-labelledby="voucher-preview" className={`${card} p-6`}>
          <h2 id="voucher-preview" className="text-xl font-semibold">Xem trước</h2>
          <p className="mt-4 text-sm" aria-live="polite">{preview || "Nhập giá trị giảm để xem ví dụ."}</p>
          <p className="mt-2 text-xs text-muted">Giảm giá chỉ áp dụng cho tiền hàng, không áp dụng cho phí vận chuyển.</p>
        </section>
        {voucher && <section aria-labelledby="voucher-usage" className={`${card} p-6`}>
          <h2 id="voucher-usage" className="text-xl font-semibold">Tình trạng</h2>
          <div className="mt-4"><StatusBadge status={voucherStateLabels[voucher.state]} /></div>
          <div className="mt-2"><DetailList items={[
            { label: "Lượt dùng", value: voucherUsageText(voucher.usedCount, voucher.usageLimit) },
            { label: "Đã giảm", value: formatVnd(voucher.discountGiven) },
            { label: "Cập nhật gần nhất", value: formatDate(voucher.updatedAt) },
          ]} /></div>
        </section>}
        {voucher && <button type="button" className={`${dangerButton} min-h-12 w-full`} onClick={askDelete}>Xóa voucher</button>}
      </aside>
    </div>

    {voucher && <AdminConfirmDialog open={deleteOpen} danger pending={deletePending} error={deleteError} onConfirm={confirmDelete} onClose={cancelDelete}
      title="Xóa voucher?" confirmLabel="Xóa voucher"
      description={`“${voucher.code}” sẽ bị xóa vĩnh viễn. Voucher đã có đơn hàng sử dụng sẽ không thể xóa, nhưng có thể tắt.`} />}
  </>;
}
