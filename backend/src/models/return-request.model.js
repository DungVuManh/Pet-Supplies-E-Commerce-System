import mongoose from "mongoose";
import { activeReturnStatuses, returnRequestSchema } from "./order.model.js";

const schema = new mongoose.Schema({
  ...returnRequestSchema.obj,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, immutable: true },
  lastOperationId: { type: mongoose.Schema.Types.ObjectId, select: false },
}, { collection: "returnRequests", timestamps: true, bufferCommands: false });

schema.index({ orderId: 1 }, {
  unique: true,
  partialFilterExpression: { status: { $in: activeReturnStatuses } },
});
schema.index({ orderId: 1, requestedAt: -1, _id: -1 });
schema.index({ status: 1, requestedAt: -1, _id: -1 });
schema.index({ requestedAt: -1, _id: -1 });

export const ReturnRequest = mongoose.models.ReturnRequest || mongoose.model("ReturnRequest", schema);
