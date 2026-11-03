// Voucher rules with no database access, so each one can be tested directly.
// The storage model is `Promotion`; "voucher" is its name in the API and on screen.

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Codes are compared trimmed and uppercase, so `petly10` matches `PETLY10`. */
export const normalizeVoucherCode = (code) => (typeof code === "string" ? code.trim().toUpperCase() : "");

/** Documents written before usage counting have no `usedCount`. */
export const voucherUsedCount = (voucher) => voucher.usedCount ?? 0;

/** `2026-11-03` → the moment that day starts in Vietnam. */
export const vietnamDayStart = (date) => new Date(`${date}T00:00:00+07:00`);

/** The moment after `2026-11-03` ends in Vietnam, because a voucher applies while `now < endAt`. */
export const vietnamDayEnd = (date) => new Date(vietnamDayStart(date).getTime() + 24 * 60 * 60 * 1000);

/** The Vietnam calendar date of a moment, as `YYYY-MM-DD`. */
export const vietnamDate = (moment) => new Date(new Date(moment).getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);

/** The last day a voucher applies. `endAt` is exclusive, so it is the day holding the moment before it. */
export const vietnamLastDate = (endAt) => vietnamDate(new Date(endAt).getTime() - 1);

/** One of `active`, `scheduled`, `expired`, `disabled`, `exhausted`. */
export function voucherState(voucher, now = new Date()) {
 if (voucher.isActive === false) return "disabled";
 if (now >= voucher.endAt) return "expired";
 if (now < voucher.startAt) return "scheduled";
 if (voucher.usageLimit != null && voucherUsedCount(voucher) >= voucher.usageLimit) return "exhausted";
 return "active";
}

/** Whole VND off the goods subtotal. Rounds down and never exceeds the subtotal. */
export function calculateDiscount(voucher, subtotal) {
 const uncapped = voucher.type === "percent" ? Math.floor((subtotal * voucher.value) / 100) : voucher.value;
 const capped = voucher.type === "percent" && voucher.maxDiscount != null ? Math.min(uncapped, voucher.maxDiscount) : uncapped;
 return Math.max(0, Math.min(capped, subtotal));
}

/**
 * Whether a voucher applies to a subtotal. `reason` stays on the server: a customer
 * only learns the minimum amount, through `below_minimum`, because they can act on it.
 */
export function evaluateVoucher(voucher, { subtotal, now = new Date() }) {
 const state = voucherState(voucher, now);
 if (state !== "active") return { applies: false, discount: 0, reason: state };
 const minOrderAmount = voucher.minOrderAmount ?? 0;
 if (subtotal < minOrderAmount) return { applies: false, discount: 0, reason: "below_minimum", minOrderAmount };
 const discount = calculateDiscount(voucher, subtotal);
 // A tiny percentage can round to nothing, and that must not spend a use.
 if (discount <= 0) return { applies: false, discount: 0, reason: "no_discount" };
 return { applies: true, discount, reason: null };
}

/** The same rule as the account validator, so `0912 345 678` and `+84912345678` are one person. Null when invalid. */
export function normalizePhone(phone) {
 if (typeof phone !== "string") return null;
 const compact = phone.replace(/[\s.-]/g, "");
 if (!/^(?:0|\+84)[0-9]{9}$/.test(compact)) return null;
 return compact.replace(/^\+84/, "0");
}

/** `user:<id>` for an account, `guest:<phone>` for a guest, or null when neither identifies them. */
export function customerKey({ userId, phone } = {}) {
 if (userId) return `user:${userId}`;
 const normalized = normalizePhone(phone);
 return normalized ? `guest:${normalized}` : null;
}
