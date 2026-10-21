import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

const cartItemSchema = new mongoose.Schema(
 {
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantSku: { type: String, required: true, trim: true },
  quantity: { ...nonNegativeInteger, min: 1, required: true },
 },
 { _id: false },
);

const cartSchema = new mongoose.Schema(
 {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  guestToken: { type: String, trim: true, minlength: 1 },
  items: {
   type: [cartItemSchema], required: true, default: [],
   validate: { validator: (items) => items.every((item) => item != null), message: "Cart items cannot be null" },
  },
 },
 { timestamps: true, bufferCommands: false },
);

cartSchema.pre("validate", function () {
 if (Boolean(this.userId) === Boolean(this.guestToken)) {
  this.invalidate("userId", "Cart must belong to either a user or a guest");
 }
});
cartSchema.index({ userId: 1 }, {
 unique: true, partialFilterExpression: { userId: { $type: "objectId" } },
});
cartSchema.index({ guestToken: 1 }, {
 unique: true, partialFilterExpression: { guestToken: { $type: "string" } },
});

export const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
