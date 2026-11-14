import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

const reviewSchema = new mongoose.Schema(
 {
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { ...nonNegativeInteger, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, default: "" },
  images: { type: [String], default: [] },
  status: { type: String, enum: ["published"], default: "published" },
 },
 { timestamps: true, bufferCommands: false },
);

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
