"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { formatCurrency } from "@/lib/format-currency";
import { useAuth } from "@/features/auth/auth-provider";
import { PageHeader, card, control, secondaryButton } from "../components/staff-ui";
import { type SaleCustomer, type SaleLine, type SaleProduct, validateSaleDraft } from "./sale-api";
import { SaleCustomerSearch, SaleProductSearch } from "./sale-search";
import { useSaleSubmission } from "./use-sale-submission";

export function CreateSaleForm() {
  const router = useRouter();
  const { user, status, refresh } = useAuth();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [customer, setCustomer] = useState<SaleCustomer | null>(null);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [cashReceived, setCashReceived] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const sale = useSaleSubmission(user?.id);
  const errors = submitted ? validateSaleDraft(mode, contact, customer, lines, cashReceived) : {};
  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const validTotal = Number.isSafeInteger(total) && total >= 0;

  useEffect(() => {
    if (status !== "ready") return;
    if (!user) router.replace("/login");
    else if (user.role !== "staff") router.replace("/forbidden");
  }, [user, status, router]);

  function canAdd(product: SaleProduct) {
    const existing = lines.find((line) => line.sku === product.sku);
    return existing ? existing.qty < Math.min(999, product.availableStock) : lines.length < 50;
  }
  function add(product: SaleProduct) {
    setCashReceived(false);
    setLines((previous) => {
      const found = previous.find((line) => line.sku === product.sku);
      return found ? previous.map((line) => line.sku === product.sku ? { ...product, qty: Math.min(found.qty + 1, product.availableStock, 999) } : line)
        : [...previous, { ...product, qty: 1 }];
    });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const invalid = validateSaleDraft(mode, contact, customer, lines, cashReceived);
    if (Object.keys(invalid).length) {
      document.getElementById(`sale-${Object.keys(invalid)[0]}`)?.focus();
      return;
    }
    void sale.submit({
      ...(mode === "existing" && customer ? { customerId: customer.id } : { customer: {
        name: contact.name.trim(), phone: contact.phone.trim(),
        ...(contact.email.trim() ? { email: contact.email.trim() } : {}),
      } }),
      items: lines.map(({ sku, qty, price }) => ({ sku, qty, expectedPrice: price })), cashReceived: true,
    });
  }

  if (status === "error") return <div role="alert" className={`${card} p-6`}><p>Chưa thể kiểm tra quyền truy cập.</p><Button className="mt-4" onClick={() => void refresh()}>Thử lại</Button></div>;
  if (status !== "ready" || user?.role !== "staff") return <p role="status">Đang kiểm tra quyền truy cập…</p>;
  return <>
    <PageHeader title="Tạo đơn hộ khách" subtitle="Bán tại quầy · Khách nhận hàng ngay · Thanh toán tiền mặt"
      action={!sale.busy && !sale.uncertain ? <Link href="/staff/orders" className={secondaryButton}>Về danh sách đơn</Link> : undefined} />
    {sale.checking && <p role="status" className="rounded-lg bg-canvas p-4">Đang kiểm tra yêu cầu tạo đơn trước đó…</p>}
    {sale.error && <div role="alert" className="rounded-lg border border-danger bg-danger-subtle p-4 text-danger"><p>{sale.error}</p>
      {sale.uncertain && <p className="mt-2 text-sm">Thông tin được giữ nguyên để tránh tạo trùng. Bấm “Gửi lại cùng yêu cầu” để kiểm tra và thử lại.</p>}
      {sale.recoveryRequired && <button type="button" onClick={() => void sale.checkPending()} className="mt-3 min-h-10 font-semibold underline">Kiểm tra lại đơn</button>}
    </div>}
    <form onSubmit={submit} noValidate>
      <fieldset disabled={sale.busy || sale.checking || sale.recoveryRequired || sale.uncertain} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <legend className="sr-only">Thông tin đơn bán tại quầy</legend>
        <div className="min-w-0 space-y-6">
          <section className={`${card} p-4 sm:p-6`}>
            <h2 className="text-xl font-semibold">1. Khách hàng</h2>
            <div className="my-5 flex flex-wrap gap-4 text-sm">
              <label className="flex min-h-11 items-center gap-2"><input type="radio" name="customer-mode" checked={mode === "new"} onChange={() => setMode("new")} /> Nhập thông tin khách</label>
              <label className="flex min-h-11 items-center gap-2"><input type="radio" name="customer-mode" checked={mode === "existing"} onChange={() => setMode("existing")} /> Customer có tài khoản</label>
            </div>
            {mode === "existing" ? <SaleCustomerSearch selected={customer} onSelect={setCustomer} error={errors.customer} />
              : <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="sale-name" label="Tên khách hàng" required maxLength={100} autoComplete="name" value={contact.name} error={errors.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                <TextField id="sale-phone" label="Số điện thoại" required maxLength={20} type="tel" autoComplete="tel" value={contact.phone} error={errors.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                <div className="sm:col-span-2"><TextField id="sale-email" label="Email (không bắt buộc)" maxLength={254} type="email" autoComplete="email" value={contact.email} error={errors.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
                <p className="text-xs text-muted sm:col-span-2">Thông tin chỉ lưu cùng đơn hàng, không tạo tài khoản đăng nhập.</p>
              </div>}
          </section>
          <section className={`${card} p-4 sm:p-6`}><h2 className="text-xl font-semibold">2. Sản phẩm</h2>
            <SaleProductSearch onAdd={add} canAdd={canAdd} error={errors.items} />
          </section>
          <section className={`${card} p-4 sm:p-6`} aria-labelledby="selected-products"><h2 id="selected-products" className="text-xl font-semibold">Sản phẩm đã chọn ({lines.length})</h2>
            {!lines.length ? <p className="mt-4 text-sm text-muted">Chưa có sản phẩm. Tìm và thêm sản phẩm vào đơn ở phía trên.</p>
              : <ul className="mt-4 divide-y divide-line">{lines.map((line) => <li key={line.sku} className="grid min-w-0 gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_100px_auto]">
                <div className="min-w-0"><p className="break-words font-semibold">{line.name}</p><p className="mt-1 break-words text-xs text-muted">{line.sku} · {line.variantLabel}</p><p className="mt-2 text-sm">{formatCurrency(line.price)} / sản phẩm</p></div>
                <label className="grid gap-2 text-xs font-medium">Số lượng<input type="number" className={`${control} w-full`} aria-label={`Số lượng ${line.sku}`} min={1} max={Math.min(999, line.availableStock)} step={1} value={line.qty}
                  aria-invalid={!Number.isInteger(line.qty) || line.qty < 1 || line.qty > Math.min(999, line.availableStock)}
                  onChange={(e) => { setCashReceived(false); setLines(lines.map((item) => item.sku === line.sku ? { ...item, qty: Number(e.target.value) } : item)); }} /></label>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right"><p className="font-semibold">{formatCurrency(line.price * line.qty)}</p><button type="button" className="mt-2 min-h-10 font-semibold text-danger" aria-label={`Xóa ${line.sku}`} onClick={() => { setCashReceived(false); setLines(lines.filter((item) => item.sku !== line.sku)); }}>Xóa</button></div>
              </li>)}</ul>}
          </section>
        </div>
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className={`${card} p-4 sm:p-6`}><h2 className="text-xl font-semibold">3. Thanh toán</h2>
            <dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted">Tạm tính</dt><dd>{validTotal ? formatCurrency(total) : "—"}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">Giảm giá / Phí giao</dt><dd>0 đ</dd></div><div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4"><dt className="font-semibold">Cần thu tiền mặt</dt><dd className="text-2xl font-semibold text-brand">{validTotal ? formatCurrency(total) : "—"}</dd></div></dl>
            <p className="mt-5 rounded-lg bg-canvas p-3 text-sm">Nhận tại cửa hàng · Không giao hàng</p>
            <label className="mt-5 flex items-start gap-3 text-sm font-medium"><input id="sale-cashReceived" type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={cashReceived} aria-invalid={Boolean(errors.cashReceived)} aria-describedby={errors.cashReceived ? "cash-error" : undefined} onChange={(e) => setCashReceived(e.target.checked)} /><span>Đã thu đủ {validTotal ? formatCurrency(total) : "tiền"} tiền mặt từ khách hàng.</span></label>
            {errors.cashReceived && <p id="cash-error" role="alert" className="mt-2 text-xs text-danger">{errors.cashReceived}</p>}
            <p className="mt-4 text-xs leading-relaxed text-muted">Chỉ xác nhận sau khi đã nhận đủ tiền. Đơn được ghi nhận hoàn tất và trừ tồn kho sau khi lưu thành công.</p>
          </section>
        </aside>
      </fieldset>
      <div className="mt-6 flex justify-end"><Button type="submit" disabled={sale.busy || sale.checking || sale.recoveryRequired} className="w-full sm:w-auto">{sale.busy ? "Đang xác nhận đơn…" : sale.uncertain ? "Gửi lại cùng yêu cầu" : "Xác nhận tạo đơn"}</Button></div>
    </form>
  </>;
}
