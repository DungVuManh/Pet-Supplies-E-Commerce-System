import type { VoucherType } from "./types";

// A non-breaking space keeps the currency sign on the same line as its amount in narrow table cells.
const vnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

type VoucherValue = { type: VoucherType; value: number; maxDiscount: number | null };

/** "Giảm 10%, tối đa 50.000 ₫" or "Giảm 50.000 ₫". */
export function voucherValueText({ type, value, maxDiscount }: VoucherValue) {
  if (type === "fixed") return `Giảm ${vnd(value)}`;
  return maxDiscount === null ? `Giảm ${value}%` : `Giảm ${value}%, tối đa ${vnd(maxDiscount)}`;
}

/** "12 / 100", or "12 / Không giới hạn". */
export function voucherUsageText(usedCount: number, usageLimit: number | null) {
  return `${usedCount.toLocaleString("vi-VN")} / ${usageLimit === null ? "Không giới hạn" : usageLimit.toLocaleString("vi-VN")}`;
}

/** The discount the server would give; for the form's preview only, because the server decides the real amount. */
export function voucherDiscount({ type, value, maxDiscount }: VoucherValue, subtotal: number) {
  const uncapped = type === "percent" ? Math.floor((subtotal * value) / 100) : value;
  const capped = type === "percent" && maxDiscount !== null ? Math.min(uncapped, maxDiscount) : uncapped;
  return Math.max(0, Math.min(capped, subtotal));
}

/** "Đơn 500.000 ₫ giảm 50.000 ₫", using the minimum order when there is one. */
export function voucherPreview(voucher: VoucherValue, minOrderAmount: number) {
  const subtotal = minOrderAmount > 0 ? minOrderAmount : 500000;
  return `Đơn ${vnd(subtotal)} giảm ${vnd(voucherDiscount(voucher, subtotal))}`;
}
