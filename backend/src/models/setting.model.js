import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

const settingSchema = new mongoose.Schema(
 {
  _id: { type: String, required: true, enum: ["global"], default: "global", immutable: true },
  lowStockThreshold: { ...nonNegativeInteger, default: 5 },
  shippingFee: { ...nonNegativeInteger, default: 0 },
 },
 { timestamps: true, bufferCommands: false },
);

export const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);
