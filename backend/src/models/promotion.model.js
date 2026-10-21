import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

const promotionSchema = new mongoose.Schema(
 {
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  type: { type: String, enum: ["percent", "fixed"], required: true },
  value: {
   type: Number,
   required: true,
   validate: {
    validator(value) {
     return value > 0 && (this.type === "percent" ? value <= 100 : Number.isSafeInteger(value));
    },
    message: "Use a percentage up to 100 or a positive integer VND amount",
   },
  },
  minOrderAmount: { ...nonNegativeInteger, default: 0 },
  startAt: { type: Date, required: true },
  endAt: {
   type: Date, required: true,
   validate: { validator(value) { return value > this.startAt; }, message: "End must follow start" },
  },
  isActive: { type: Boolean, default: true },
  // Eligibility rules are not defined by the SRS; application logic must validate them.
  eligibility: mongoose.Schema.Types.Mixed,
 },
 { timestamps: true, bufferCommands: false },
);

promotionSchema.index({ isActive: 1, startAt: 1, endAt: 1 });

export const Promotion = mongoose.models.Promotion || mongoose.model("Promotion", promotionSchema);
