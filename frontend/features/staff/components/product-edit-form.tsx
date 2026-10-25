"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { money } from "../mock-data";
import { StaffProductsApiError, updateStaffProduct, validateProductDraft, type StaffProductDetail, type ProductStatus } from "../products/api";
import { Badge, card, control, primaryLink, secondaryButton } from "./staff-ui";

export function ProductEditForm({ product: p }: { product: StaffProductDetail }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [physical, setPhysical] = useState(String(p.physical));
  const [status, setStatus] = useState<ProductStatus>(p.status);
  const [description, setDescription] = useState(p.description);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const quantityRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const locked = useRef(false);
  const busy = saving || refreshing;
  const errors = submitted ? validateProductDraft(physical, description, p.reserved) : {};
  const available = /^\d+$/.test(physical) && Number.isSafeInteger(Number(physical)) ? Number(physical) - p.reserved : null;
  const detailHref = `/staff/products/${encodeURIComponent(p.sku)}`;

  function edited() { setSaved(false); setFailure(""); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || busy || needsReload) return;
    setSubmitted(true); setSaved(false); setFailure("");
    const issues = validateProductDraft(physical, description, p.reserved);
    if (issues.physical) { quantityRef.current?.focus(); return; }
    if (issues.description) { descriptionRef.current?.focus(); return; }
    locked.current = true; setSaving(true);
    try {
      await updateStaffProduct(p.sku, { physical: Number(physical), status, description: description.trim(),
        expected: { physical: p.physical, reserved: p.reserved, status: p.status, description: p.description } });
      setPhysical(String(Number(physical))); setDescription(description.trim()); setSaved(true);
      startTransition(() => { router.push(detailHref); router.refresh(); });
    } catch (error) {
      if (error instanceof StaffProductsApiError) {
        if (error.status === 401) { router.replace("/login"); return; }
        if (error.status === 403 && error.code !== "CSRF_INVALID") { router.replace("/forbidden"); return; }
        setFailure(error.message);
        setNeedsReload(error.status === 0 || error.status === 404 || error.status >= 500 || error.code === "PRODUCT_CHANGED");
      } else { setFailure("Chưa xác nhận được kết quả. Hãy tải lại sản phẩm để kiểm tra."); setNeedsReload(true); }
    } finally { locked.current = false; setSaving(false); }
  }

  return <>
    {saved && <p role="status" className="rounded-lg bg-success-subtle p-4 font-semibold text-success">Cập nhật sản phẩm thành công.</p>}
    {failure && <div role="alert" className="space-y-3 rounded-lg bg-danger-subtle p-4 text-danger">
      <p>{failure}</p>
      {needsReload && <button type="button" className={secondaryButton} onClick={() => window.location.reload()}>Tải lại sản phẩm</button>}
    </div>}
    <form onSubmit={submit} noValidate aria-busy={busy} className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_344px]">
      <fieldset disabled={busy || needsReload} className="min-w-0 space-y-6">
        <legend className="sr-only">Thông tin chỉnh sửa sản phẩm</legend>
        <section className={`${card} p-6`}>
          <h2 className="text-xl font-semibold">Trạng thái & tồn kho</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,2fr)_200px]">
            <label className="grid gap-2 font-medium">Trạng thái hiển thị *
              <select className={control} value={status} onChange={(event) => { setStatus(event.target.value as ProductStatus); edited(); }}>
                <option value="active">Đang bán</option><option value="hidden">Tạm ẩn</option>
              </select>
            </label>
            <label className="grid gap-2 font-medium" htmlFor="product-physical">Số lượng thực tế *
              <input id="product-physical" ref={quantityRef} type="number" min={p.reserved} max={Number.MAX_SAFE_INTEGER} step={1} required
                className={control} value={physical} onChange={(event) => { setPhysical(event.target.value); edited(); }}
                aria-invalid={Boolean(errors.physical)} aria-describedby={errors.physical ? "product-quantity-error" : "product-stock-hint"} />
            </label>
          </div>
          {errors.physical && <p id="product-quantity-error" role="alert" className="mt-4 text-danger">{errors.physical}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-4">
            <dt className="text-muted">Giữ chỗ trong đơn</dt><dd className="text-right">{p.reserved} sản phẩm</dd>
            <dt className="text-muted">Tồn khả dụng sau cập nhật</dt><dd className="text-right font-semibold">{available ?? "—"} sản phẩm</dd>
          </dl>
          <p id="product-stock-hint" className="mt-4 text-xs text-muted">Số thực tế không được nhỏ hơn {p.reserved} sản phẩm đang giữ chỗ. Ngưỡng cảnh báo: {p.threshold}.</p>
        </section>
        <section className={`${card} p-6`}>
          <h2 className="text-xl font-semibold">Mô tả sản phẩm</h2>
          <div className="mt-5 grid gap-2">
            <label className="font-medium" htmlFor="product-description">Mô tả *</label>
            <textarea id="product-description" ref={descriptionRef} className="min-h-40 min-w-0 rounded-lg border border-line p-4 font-normal" required
              maxLength={10000} value={description} onChange={(event) => { setDescription(event.target.value); edited(); }}
              aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "product-description-error" : "product-description-hint"} />
          </div>
          {errors.description && <p id="product-description-error" role="alert" className="mt-3 text-danger">{errors.description}</p>}
          <p id="product-description-hint" className="mt-3 text-xs text-muted">Tối đa 10.000 ký tự, bao gồm mô tả và hướng dẫn sử dụng.</p>
          <div className="mt-5 flex flex-wrap gap-4">
            <button type="submit" className={`${primaryLink} disabled:cursor-not-allowed disabled:opacity-50`}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
            {!busy && <Link href={detailHref} className={secondaryButton}>Hủy thay đổi</Link>}
          </div>
        </section>
      </fieldset>
      <aside className="min-w-0 space-y-6">
        <section className={`${card} p-6`}>
          <h2 className="text-xl font-semibold">Thông tin cố định</h2>
          <Image src={p.image || "/images/products/royal-canin-mini-adult.png"} alt="" width={296} height={184} className="mt-4 h-48 w-full rounded-lg bg-canvas object-contain" />
          <p className="mt-4 font-semibold">{p.name}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-muted">
            <dt>SKU</dt><dd className="break-words text-right text-ink">{p.sku}</dd>
            <dt>Giá bán</dt><dd className="text-right text-ink">{money(p.price)}</dd>
            <dt>Khối lượng</dt><dd className="text-right text-ink">{p.weight}</dd>
          </dl>
          <div className="mt-4"><Badge tone={status === "active" ? "success" : "neutral"}>{status === "active" ? "Đang bán" : "Tạm ẩn"}</Badge></div>
        </section>
        <div className="rounded-lg bg-brand-subtle p-4">
          <strong>Quyền chỉnh sửa của Staff</strong>
          <p className="mt-2 leading-relaxed text-muted">Được sửa trạng thái, số lượng và mô tả. Giá bán, tên, danh mục và ảnh do quản lý thiết lập.</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">Trạng thái và mô tả áp dụng cho mọi quy cách của sản phẩm. Số lượng chỉ cập nhật cho SKU {p.sku}.</p>
        </div>
      </aside>
    </form>
  </>;
}
