import { vietnamLastDate } from "./voucher-rules.js";

const RETENTION_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Determines the dynamic wallet state of a voucher for a user:
 * - 'used': the user has an active redemption on an order
 * - 'expired': the voucher has expired, disabled, or reached usage limit
 * - 'ready': the voucher is valid, within its date range, and ready to apply
 */
export function computeCustomerVoucherState(promotion, activeRedemption, now = new Date()) {
  if (activeRedemption) {
    return "used";
  }

  if (!promotion || promotion.isActive === false) {
    return "expired";
  }

  const nowDate = now instanceof Date ? now : new Date(now);
  if (promotion.endAt && nowDate >= new Date(promotion.endAt)) {
    return "expired";
  }

  if (promotion.usageLimit != null && (promotion.usedCount ?? 0) >= promotion.usageLimit) {
    return "expired";
  }

  return "ready";
}

/**
 * Checks whether a voucher should be filtered out/cleaned up based on FR-016:
 * Expired or used for > 30 days.
 */
export function isStaleVoucher(promotion, state, redemptionDate, now = new Date(), maxAgeMs = RETENTION_LIMIT_MS) {
  const currentMs = (now instanceof Date ? now : new Date(now)).getTime();

  if (state === "used") {
    if (redemptionDate) {
      const redeemedMs = new Date(redemptionDate).getTime();
      return currentMs - redeemedMs > maxAgeMs;
    }
    return false;
  }

  if (state === "expired") {
    if (promotion?.endAt) {
      const expiredMs = new Date(promotion.endAt).getTime();
      return currentMs - expiredMs > maxAgeMs;
    }
    return false;
  }

  return false;
}

/**
 * Formats a customer voucher record and promotion model into a standard CustomerVoucherItem
 */
export function formatCustomerVoucherItem(customerVoucher, promotion, state, subtotal) {
  const minOrderAmount = promotion?.minOrderAmount ?? 0;
  const isApplicable = state === "ready" && (subtotal != null ? subtotal >= minOrderAmount : true);

  return {
    _id: customerVoucher?._id ? String(customerVoucher._id) : "",
    voucherId: promotion?._id ? String(promotion._id) : String(customerVoucher?.voucherId ?? ""),
    code: promotion?.code || customerVoucher?.code || "",
    name: promotion?.name ?? "",
    type: promotion?.type || "percent",
    value: promotion?.value ?? 0,
    maxDiscount: promotion?.maxDiscount ?? null,
    minOrderAmount,
    startAt: promotion?.startAt ? new Date(promotion.startAt).toISOString() : "",
    endAt: promotion?.endAt ? new Date(promotion.endAt).toISOString() : "",
    endDate: promotion?.endAt ? vietnamLastDate(promotion.endAt) : "Không giới hạn",
    savedAt: customerVoucher?.savedAt
      ? new Date(customerVoucher.savedAt).toISOString()
      : new Date().toISOString(),
    state,
    isApplicable,
  };
}

