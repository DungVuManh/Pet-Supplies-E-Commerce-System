import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

export const MASTER_DATA_KINDS = ["petType", "breed", "brand", "unit", "shippingMethod"];

// Admin reference data, one collection per the spec. Products keep storing brand,
// pet type, and unit as names, so nothing else depends on these documents yet.
const masterDataSchema = new mongoose.Schema(
 {
  kind: { type: String, enum: MASTER_DATA_KINDS, required: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 300, default: "" },
  petTypeCode: { type: String, trim: true, uppercase: true },
  fee: { ...nonNegativeInteger },
  isActive: { type: Boolean, default: true },
 },
 { collection: "masterData", timestamps: true, bufferCommands: false },
);

masterDataSchema.index({ kind: 1, code: 1 }, { unique: true });

export const MasterData = mongoose.models.MasterData || mongoose.model("MasterData", masterDataSchema);
