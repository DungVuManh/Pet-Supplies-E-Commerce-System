// Voucher helpers shared by the cart, checkout, homepage and voucher page, which
// must not import each other. API calls are in `voucher-api.ts`.

export type VoucherQuoteItem = { productId: string; variantSku: string; qty: number };

/** `POST /api/v1/vouchers/quote`. The server decides; these amounts are only ever displayed. */
export type VoucherQuote = { code: string; name: string; subtotal: number; discount: number; total: number };

/** One row of `GET /api/v1/vouchers/public`. `endDate` is the last valid Vietnam calendar day. */
export type PublicVoucher = {
  code: string;
  name: string;
  type: "percent" | "fixed";
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  endDate: string;
};

export const VOUCHER_APPLIED_MESSAGE = "Đã áp dụng mã giảm giá."; // MSG17
export const VOUCHER_NONE_MESSAGE = "Chưa áp dụng mã giảm giá.";

const STORAGE_KEY = "petjoy_voucher_code";

/** The code carried from the cart to checkout. Storage can be unavailable, and the card then simply starts empty. */
export function rememberedVoucherCode(storage: Pick<Storage, "getItem"> | undefined = globalThis.sessionStorage) {
  try {
    return storage?.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function rememberVoucherCode(code: string, storage: Pick<Storage, "setItem"> | undefined = globalThis.sessionStorage) {
  try {
    storage?.setItem(STORAGE_KEY, code);
  } catch {
    // The customer can enter the code again.
  }
}

export function forgetVoucherCode(storage: Pick<Storage, "removeItem"> | undefined = globalThis.sessionStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The phone to check once-per-customer with: only a complete number, so typing does not send a quote per digit. */
export function voucherQuotePhone(phone: string | undefined) {
  const compact = (phone ?? "").replace(/[\s.-]/g, "");
  return /^(?:0|\+84)[0-9]{9}$/.test(compact) ? compact : undefined;
}

const vnd = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

/** "10%" or "50.000đ". */
export const voucherValueLabel = ({ type, value }: Pick<PublicVoucher, "type" | "value">) => (type === "percent" ? `${value}%` : vnd(value));

/** "tối đa 50.000đ", or null when there is no cap. */
export const voucherCapLabel = ({ maxDiscount }: Pick<PublicVoucher, "maxDiscount">) => (maxDiscount === null ? null : `tối đa ${vnd(maxDiscount)}`);

/** "Từ 500.000đ" or "Mọi đơn hàng". */
export const voucherMinimumLabel = ({ minOrderAmount }: Pick<PublicVoucher, "minOrderAmount">) => (minOrderAmount > 0 ? `Từ ${vnd(minOrderAmount)}` : "Mọi đơn hàng");

/** "HSD 30/11/2026". */
export function voucherExpiryLabel({ endDate }: Pick<PublicVoucher, "endDate">) {
  const [year, month, day] = endDate.split("-");
  return `HSD ${day}/${month}/${year}`;
}
