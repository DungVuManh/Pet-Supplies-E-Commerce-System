import { PromotionRedemption } from "../models/promotion-redemption.model.js";
import { Promotion } from "../models/promotion.model.js";
import { customerKey, evaluateVoucher, normalizeVoucherCode } from "./voucher-rules.js";

// MSG16: the same answer for every failure, so the API cannot be used to discover codes or their state.
export const VOUCHER_INVALID_MESSAGE = "Mã giảm giá không hợp lệ hoặc không áp dụng được cho đơn hàng này.";
export const VOUCHER_CHANGED_MESSAGE = "Mã giảm giá vừa thay đổi. Vui lòng kiểm tra lại tổng tiền và đặt hàng lại.";

// A once-per-customer voucher needs an identity. Others record this for a guest with no usable phone.
const UNIDENTIFIED_GUEST = "guest:unknown";

/** A customer who can act on the reason gets it; every other failure stays MSG16. */
export function voucherRefusalMessage(check) {
 if (check.reason === "below_minimum") {
  return `Đơn hàng cần tối thiểu ${check.minOrderAmount.toLocaleString("vi-VN")} ₫ để dùng mã giảm giá này.`;
 }
 return VOUCHER_INVALID_MESSAGE;
}

const onceOnly = (voucher) => voucher.oncePerCustomer !== false;

/**
 * Whether a code applies right now, reserving nothing. `customer` is `{ userId, phone }`.
 * A guest whose phone is not known yet passes here; the order step checks them.
 */
export async function checkVoucher(code, { subtotal, customer, now = new Date() }) {
 const normalized = normalizeVoucherCode(code);
 const voucher = normalized ? await Promotion.findOne({ code: normalized }).lean() : null;
 if (!voucher) return { applies: false, discount: 0, reason: "not_found" };

 const evaluation = evaluateVoucher(voucher, { subtotal, now });
 if (!evaluation.applies) return { ...evaluation, voucher };

 const key = customerKey(customer);
 if (key && onceOnly(voucher) && await PromotionRedemption.exists({ promotionId: voucher._id, customerKey: key, status: "active" })) {
  return { applies: false, discount: 0, reason: "already_used", voucher };
 }
 return { ...evaluation, voucher };
}

/** Never below zero. `timestamps: false`, because an Admin's open form compares `updatedAt` and a sale is not an edit. */
function giveUseBack(promotionId) {
 return Promotion.updateOne({ _id: promotionId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { timestamps: false });
}

/**
 * Reserves one use for `orderId`. The conditional `$inc` keeps the count within the limit, and
 * the redemption's unique indexes enforce once per customer. `updatedAt` is part of the condition,
 * so an Admin edit since the voucher was read refuses this order rather than charging an old amount.
 * Returns `{ reserved: true }` or `{ reserved: false, reason }`.
 */
export async function reserveVoucher({ voucher, discount, customer, orderId, now = new Date() }) {
 const key = customerKey(customer);
 if (!key && onceOnly(voucher)) return { reserved: false, reason: "unknown_customer" };

 const spent = await Promotion.updateOne({
  _id: voucher._id,
  updatedAt: voucher.updatedAt,
  isActive: { $ne: false },
  startAt: { $lte: now },
  endAt: { $gt: now },
  $expr: { $or: [{ $eq: [{ $ifNull: ["$usageLimit", null] }, null] }, { $lt: [{ $ifNull: ["$usedCount", 0] }, "$usageLimit"] }] },
 }, { $inc: { usedCount: 1 } }, { timestamps: false });
 if (spent.modifiedCount !== 1) return { reserved: false, reason: "unavailable" };

 try {
  await PromotionRedemption.create({
   promotionId: voucher._id, code: voucher.code, orderId, customerKey: key ?? UNIDENTIFIED_GUEST, discount, status: "active", oncePerCustomer: onceOnly(voucher),
  });
  return { reserved: true };
 } catch (error) {
  await giveUseBack(voucher._id);
  if (error?.code === 11000) return { reserved: false, reason: "already_used" };
  throw error;
 }
}

/** Undoes a reservation whose order was never created. */
export async function undoReservation({ voucher, orderId }) {
 await PromotionRedemption.deleteOne({ orderId });
 await giveUseBack(voucher._id);
}

/**
 * Gives a cancelled order's use back. Only the caller that flips the redemption decrements the count,
 * so a repeat does nothing. Failures are logged and never block the cancellation.
 */
export async function releaseVoucher(orderId) {
 try {
  const redemption = await PromotionRedemption.findOneAndUpdate(
   { orderId, status: "active" },
   { $set: { status: "released", releasedAt: new Date() } },
  ).lean();
  if (!redemption) return false;
  await giveUseBack(redemption.promotionId);
  return true;
 } catch {
  // Raw errors can contain request data.
  console.error("[voucher] Failed to release voucher for a cancelled order", { orderId: String(orderId) });
  return false;
 }
}
