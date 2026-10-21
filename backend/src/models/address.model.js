import mongoose from "mongoose";
import { addressFields } from "./shared.schema.js";

const addressSchema = new mongoose.Schema(
 {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ...addressFields,
  isDefault: { type: Boolean, default: false },
 },
 { timestamps: true, bufferCommands: false },
);

addressSchema.index({ userId: 1 });
addressSchema.index(
 { userId: 1, isDefault: 1 },
 { unique: true, partialFilterExpression: { isDefault: true } },
);

export const Address = mongoose.models.Address || mongoose.model("Address", addressSchema);
