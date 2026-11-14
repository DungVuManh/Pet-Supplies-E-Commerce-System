import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

export const STOCK_MOVEMENT_TYPES = ["in", "out", "adjust"];
export const STOCK_MOVEMENT_SOURCES = ["receipt", "adjustment", "cancellation", "order"];

const sourceSchema = new mongoose.Schema(
 {
  kind: { type: String, enum: STOCK_MOVEMENT_SOURCES, required: true },
  id: { type: String, trim: true },
 },
 { _id: false },
);

// The import/export history. `quantity` is signed: an adjustment can lower stock.
const stockMovementSchema = new mongoose.Schema(
 {
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  sku: { type: String, required: true, trim: true },
  type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
  quantity: { type: Number, required: true, validate: { validator: Number.isSafeInteger, message: "Must be a safe integer" } },
  stockBefore: { ...nonNegativeInteger, required: true },
  stockAfter: { ...nonNegativeInteger, required: true },
  reason: { type: String, trim: true, maxlength: 300 },
  source: { type: sourceSchema, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  at: { type: Date, required: true, default: Date.now },
 },
 { collection: "stockMovements", timestamps: true, bufferCommands: false },
);

stockMovementSchema.index({ sku: 1, at: -1 });
stockMovementSchema.index({ productId: 1, at: -1 });
stockMovementSchema.index({ at: -1 });

export const StockMovement = mongoose.models.StockMovement || mongoose.model("StockMovement", stockMovementSchema);
