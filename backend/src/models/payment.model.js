import mongoose from "mongoose";
import { nonNegativeInteger, paymentMethods, paymentStatuses } from "./shared.schema.js";

const paymentSchema = new mongoose.Schema(
 {
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  method: { type: String, enum: paymentMethods, required: true },
  amount: { ...nonNegativeInteger, required: true },
  status: {
   type: String, enum: paymentStatuses,
   default() { return this.method === "ONLINE" ? "pending" : "unpaid"; },
  },
  transactionRef: { type: String, trim: true, minlength: 1 },
  qrPayload: String,
  rawResult: { type: mongoose.Schema.Types.Mixed, select: false },
 },
 { timestamps: true, bufferCommands: false },
);

paymentSchema.index({ orderId: 1, createdAt: -1 });
paymentSchema.index({ transactionRef: 1 }, {
 unique: true, partialFilterExpression: { transactionRef: { $type: "string" } },
});

export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
