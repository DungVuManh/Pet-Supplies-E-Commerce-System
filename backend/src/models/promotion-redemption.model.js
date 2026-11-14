import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

export const REDEMPTION_STATUSES = ["active", "released"];

/**
 * One use of a voucher by one order. MongoDB is standalone here, so these unique indexes, not a
 * transaction, are what make "once per order" and "once per customer" hold under concurrent orders.
 */
const promotionRedemptionSchema = new mongoose.Schema(
 {
  promotionId: { type: mongoose.Schema.Types.ObjectId, ref: "Promotion", required: true },
  // Kept as text so reports stay readable if the voucher is ever removed.
  code: { type: String, required: true, trim: true, uppercase: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  // `user:<User._id>` or `guest:<normalized phone>`.
  customerKey: { type: String, required: true, trim: true },
  discount: { ...nonNegativeInteger, required: true },
  status: { type: String, enum: REDEMPTION_STATUSES, default: "active" },
  // Copied from the voucher when redeemed, so editing it later cannot change this index's meaning.
  oncePerCustomer: { type: Boolean, required: true },
  releasedAt: Date,
 },
 { collection: "promotionRedemptions", timestamps: true, bufferCommands: false },
);

promotionRedemptionSchema.index({ orderId: 1 }, { unique: true });
promotionRedemptionSchema.index(
 { promotionId: 1, customerKey: 1 },
 { unique: true, partialFilterExpression: { status: "active", oncePerCustomer: true } },
);
promotionRedemptionSchema.index({ promotionId: 1, status: 1 });

export const PromotionRedemption = mongoose.models.PromotionRedemption
 || mongoose.model("PromotionRedemption", promotionRedemptionSchema);
