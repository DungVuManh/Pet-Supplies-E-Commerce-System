"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Minus, Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { formatCurrency } from "@/lib/format-currency";
import { useAuth } from "@/features/auth/auth-provider";
import { PageHeader, card, secondaryButton } from "../components/staff-ui";
import {
 type SaleCustomer,
 type SaleLine,
 type SaleProduct,
 validateSaleDraft,
} from "./sale-api";
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
 const errors = submitted
  ? validateSaleDraft(mode, contact, customer, lines, cashReceived)
  : {};
 const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
 const totalQty = lines.reduce(
  (sum, line) =>
   sum + (Number.isInteger(line.qty) && line.qty > 0 ? line.qty : 0),
  0,
 );
 const validTotal = Number.isSafeInteger(total) && total >= 0;
 const isFormLocked =
  sale.busy || sale.checking || sale.recoveryRequired || sale.uncertain;
 const selectedQuantities = Object.fromEntries(
  lines.map((line) => [line.sku, line.qty]),
 );

 useEffect(() => {
  if (status !== "ready") return;
  if (!user) router.replace("/login");
  else if (user.role !== "staff") router.replace("/forbidden");
 }, [user, status, router]);

 function canAdd(product: SaleProduct) {
  const existing = lines.find((line) => line.sku === product.sku);
  return existing
   ? existing.qty < Math.min(999, product.availableStock)
   : lines.length < 50;
 }

 function add(product: SaleProduct) {
  setCashReceived(false);
  setLines((previous) => {
   const found = previous.find((line) => line.sku === product.sku);
   return found
    ? previous.map((line) =>
       line.sku === product.sku
        ? {
           ...product,
           qty: Math.min(found.qty + 1, product.availableStock, 999),
          }
        : line,
      )
    : [...previous, { ...product, qty: 1 }];
  });
 }

 function updateQty(sku: string, nextQty: number) {
  setCashReceived(false);
  setLines((previous) =>
   previous.map((item) =>
    item.sku === sku ? { ...item, qty: nextQty } : item,
   ),
  );
 }

 function clampQtyOnBlur(
  sku: string,
  currentQty: number,
  availableStock: number,
 ) {
  const maxQty = Math.min(999, availableStock);
  const clamped = Number.isInteger(currentQty)
   ? Math.max(1, Math.min(currentQty, maxQty))
   : 1;
  if (clamped !== currentQty) {
   updateQty(sku, clamped);
  }
 }

 function removeLine(sku: string) {
  setCashReceived(false);
  setLines((previous) => previous.filter((item) => item.sku !== sku));
 }

 function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setSubmitted(true);
  const invalid = validateSaleDraft(
   mode,
   contact,
   customer,
   lines,
   cashReceived,
  );
  if (Object.keys(invalid).length) {
   document.getElementById(`sale-${Object.keys(invalid)[0]}`)?.focus();
   return;
  }
  void sale.submit({
   ...(mode === "existing" && customer
    ? { customerId: customer.id }
    : {
       customer: {
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        ...(contact.email.trim() ? { email: contact.email.trim() } : {}),
       },
      }),
   items: lines.map(({ sku, qty, price }) => ({
    sku,
    qty,
    expectedPrice: price,
   })),
   cashReceived: true,
  });
 }

 if (status === "error") {
  return (
   <div role="alert" className={`${card} p-6`}>
    <p>Chưa thể kiểm tra quyền truy cập.</p>
    <Button className="mt-4" onClick={() => void refresh()}>
     Thử lại
    </Button>
   </div>
  );
 }
 if (status !== "ready" || user?.role !== "staff") {
  return <p role="status">Đang kiểm tra quyền truy cập…</p>;
 }

 return (
  <>
   <PageHeader
    title="Tạo đơn hộ khách"
    subtitle="Bán tại quầy · Khách nhận hàng ngay · Thanh toán tiền mặt"
    action={
     !sale.busy && !sale.uncertain ? (
      <Link href="/staff/orders" className={secondaryButton}>
       Về danh sách đơn
      </Link>
     ) : undefined
    }
   />
   {sale.checking && (
    <p role="status" className="rounded-lg bg-canvas p-4">
     Đang kiểm tra yêu cầu tạo đơn trước đó…
    </p>
   )}
   {sale.error && (
    <div
     role="alert"
     className="rounded-lg border border-danger bg-danger-subtle p-4 text-danger"
    >
     <p>{sale.error}</p>
     {sale.uncertain && (
      <p className="mt-2 text-sm">
       Thông tin được giữ nguyên để tránh tạo trùng. Bấm “Gửi lại cùng yêu cầu”
       để kiểm tra và thử lại.
      </p>
     )}
     {sale.recoveryRequired && (
      <button
       type="button"
       onClick={() => void sale.checkPending()}
       className="mt-3 min-h-10 font-semibold underline"
      >
       Kiểm tra lại đơn
      </button>
     )}
    </div>
   )}

   <form
    onSubmit={submit}
    noValidate
    className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(390px,1fr)]"
   >
    <fieldset disabled={isFormLocked} className="min-w-0 space-y-6">
     <legend className="sr-only">Thông tin khách hàng và sản phẩm</legend>
     <section className={`${card} p-4 sm:p-6`}>
      <h2 className="text-xl font-semibold">1. Khách hàng</h2>
      <div className="my-5 flex flex-wrap gap-4 text-sm">
       <label className="flex min-h-11 items-center gap-2">
        <input
         type="radio"
         name="customer-mode"
         checked={mode === "new"}
         onChange={() => setMode("new")}
        />{" "}
        Nhập thông tin khách
       </label>
       <label className="flex min-h-11 items-center gap-2">
        <input
         type="radio"
         name="customer-mode"
         checked={mode === "existing"}
         onChange={() => setMode("existing")}
        />{" "}
        Customer có tài khoản
       </label>
      </div>
      {mode === "existing" ? (
       <SaleCustomerSearch
        selected={customer}
        onSelect={setCustomer}
        error={errors.customer}
       />
      ) : (
       <div className="grid gap-4 sm:grid-cols-2">
        <TextField
         id="sale-name"
         label="Tên khách hàng"
         required
         maxLength={100}
         autoComplete="name"
         value={contact.name}
         error={errors.name}
         onChange={(e) => setContact({ ...contact, name: e.target.value })}
        />
        <TextField
         id="sale-phone"
         label="Số điện thoại"
         required
         maxLength={20}
         type="tel"
         autoComplete="tel"
         value={contact.phone}
         error={errors.phone}
         onChange={(e) => setContact({ ...contact, phone: e.target.value })}
        />
        <div className="sm:col-span-2">
         <TextField
          id="sale-email"
          label="Email (không bắt buộc)"
          maxLength={254}
          type="email"
          autoComplete="email"
          value={contact.email}
          error={errors.email}
          onChange={(e) => setContact({ ...contact, email: e.target.value })}
         />
        </div>
        <p className="text-xs text-muted sm:col-span-2">
         Thông tin chỉ lưu cùng đơn hàng, không tạo tài khoản đăng nhập.
        </p>
       </div>
      )}
     </section>

     <section className={`${card} p-4 sm:p-6`}>
      <h2 className="text-xl font-semibold">2. Sản phẩm</h2>
      <SaleProductSearch
       onAdd={add}
       canAdd={canAdd}
       selectedQuantities={selectedQuantities}
       error={errors.items}
      />
     </section>
    </fieldset>

    <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
     <section
      className={`${card} p-4 sm:p-6`}
      aria-labelledby="payment-section-heading"
     >
      <fieldset disabled={isFormLocked} className="min-w-0">
       <legend className="sr-only">Sản phẩm đã chọn và thanh toán</legend>

       <div className="flex items-center justify-between gap-2">
        <h2 id="payment-section-heading" className="text-xl font-semibold">
         3. Thanh toán
        </h2>
        <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand tabular-nums">
         {totalQty} sản phẩm
        </span>
       </div>

       {/* Danh sách sản phẩm đã chọn */}
       <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
         Sản phẩm đã chọn ({lines.length})
        </p>
        {!lines.length ? (
         <div className="rounded-xl border border-dashed border-line bg-canvas/60 px-4 py-6 text-center text-sm text-muted">
          Chưa có sản phẩm.
         </div>
        ) : (
         <ul
          className="max-h-[380px] divide-y divide-line overflow-y-auto pr-1"
          aria-label="Sản phẩm đã chọn"
         >
          {lines.map((line) => {
           const maxQty = Math.min(999, line.availableStock);
           const isQtyInvalid =
            !Number.isInteger(line.qty) || line.qty < 1 || line.qty > maxQty;
           return (
            <li key={line.sku} className="flex items-start gap-3 py-3.5">
             {/* Ảnh thumbnail */}
             <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
              {line.image ? (
               <Image
                src={line.image}
                alt={line.name}
                fill
                sizes="56px"
                className="object-cover"
               />
              ) : (
               <div className="flex h-full w-full items-center justify-center text-muted">
                <Package
                 className="h-6 w-6"
                 strokeWidth={1.5}
                 aria-hidden="true"
                />
               </div>
              )}
             </div>

             {/* Thông tin + Stepper & Nút xóa */}
             <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
               <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                 {line.name}
                </p>
                <p className="mt-0.5 break-words text-xs text-muted">
                 SKU: {line.sku}
                 {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                </p>
               </div>
               <p className="shrink-0 whitespace-nowrap text-sm font-bold text-brand tabular-nums">
                {Number.isSafeInteger(line.price * line.qty) && line.qty > 0
                 ? formatCurrency(line.price * line.qty)
                 : "—"}
               </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
               <div
                className={`inline-flex items-center rounded-lg border bg-surface ${
                 isQtyInvalid ? "border-danger" : "border-line"
                }`}
               >
                <button
                 type="button"
                 aria-label={`Giảm số lượng ${line.sku}`}
                 disabled={line.qty <= 1}
                 onClick={() => updateQty(line.sku, Math.max(1, line.qty - 1))}
                 className="flex h-8 w-8 items-center justify-center rounded-l-lg text-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                 <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <input
                 type="number"
                 aria-label={`Số lượng ${line.sku}`}
                 min={1}
                 max={maxQty}
                 step={1}
                 value={line.qty}
                 aria-invalid={isQtyInvalid}
                 onChange={(e) => updateQty(line.sku, Number(e.target.value))}
                 onBlur={() =>
                  clampQtyOnBlur(line.sku, line.qty, line.availableStock)
                 }
                 className="h-8 w-9 bg-transparent text-center text-sm font-medium text-ink tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                 type="button"
                 aria-label={`Tăng số lượng ${line.sku}`}
                 disabled={line.qty >= maxQty}
                 onClick={() =>
                  updateQty(line.sku, Math.min(maxQty, line.qty + 1))
                 }
                 className="flex h-8 w-8 items-center justify-center rounded-r-lg text-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                 <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
               </div>

               <button
                type="button"
                aria-label={`Xóa ${line.sku}`}
                title="Xóa sản phẩm"
                onClick={() => removeLine(line.sku)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
               >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
               </button>
              </div>
              {line.qty > maxQty && (
               <p className="mt-1 text-xs text-danger">
                Tối đa {maxQty} sản phẩm khả dụng
               </p>
              )}
             </div>
            </li>
           );
          })}
         </ul>
        )}
       </div>

       {/* Tổng kết thanh toán */}
       <dl className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4">
         <dt className="text-muted">Tạm tính</dt>
         <dd className="tabular-nums">
          {validTotal ? formatCurrency(total) : "—"}
         </dd>
        </div>
        <div className="flex justify-between gap-4">
         <dt className="text-muted">Giảm giá</dt>
         <dd className="tabular-nums">0 đ</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-3">
         <dt className="font-semibold">Cần thu tiền mặt</dt>
         <dd className="text-2xl font-semibold text-brand tabular-nums">
          {validTotal ? formatCurrency(total) : "—"}
         </dd>
        </div>
       </dl>

       <label className="mt-4 flex items-start gap-3 text-sm font-medium">
        <input
         id="sale-cashReceived"
         type="checkbox"
         className="mt-1 h-4 w-4 shrink-0"
         checked={cashReceived}
         aria-invalid={Boolean(errors.cashReceived)}
         aria-describedby={errors.cashReceived ? "cash-error" : undefined}
         onChange={(e) => setCashReceived(e.target.checked)}
        />
        <span>
         Đã thu đủ {validTotal ? formatCurrency(total) : "tiền"} tiền mặt từ
         khách hàng.
        </span>
       </label>
       {errors.cashReceived && (
        <p id="cash-error" role="alert" className="mt-2 text-xs text-danger">
         {errors.cashReceived}
        </p>
       )}

       <p className="mt-3 text-xs leading-relaxed text-muted">
        Chỉ xác nhận sau khi đã nhận đủ tiền. Đơn được ghi nhận hoàn tất và trừ
        tồn kho sau khi lưu thành công.
       </p>
      </fieldset>

      <div className="mt-5 border-t border-line pt-4">
       <Button
        type="submit"
        disabled={sale.busy || sale.checking || sale.recoveryRequired}
        className="w-full"
       >
        {sale.busy
         ? "Đang xác nhận đơn…"
         : sale.uncertain
           ? "Gửi lại cùng yêu cầu"
           : "Xác nhận tạo đơn"}
       </Button>
      </div>
     </section>
    </aside>
   </form>
  </>
 );
}
