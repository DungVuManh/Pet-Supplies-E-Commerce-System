import mongoose from "mongoose";
import {
 nonNegativeInteger, shippingAddressSchema, paymentMethods, paymentStatuses, orderStatuses,
} from "./shared.schema.js";

const orderItemSchema = new mongoose.Schema(
 {
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantSku: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  unitPrice: { ...nonNegativeInteger, required: true },
  qty: { ...nonNegativeInteger, min: 1, required: true },
 },
 { _id: false },
);
const guestInfoSchema = new mongoose.Schema(
 {
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
 },
 { _id: false },
);
const statusHistorySchema = new mongoose.Schema(
 {
  from: { type: String, enum: orderStatuses },
  to: { type: String, enum: orderStatuses, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  at: { type: Date, default: Date.now, required: true },
 },
 { _id: false },
);

const orderSchema = new mongoose.Schema(
 {
  orderCode: { type: String, required: true, trim: true, unique: true, immutable: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  guestInfo: {
   type: guestInfoSchema,
   required() { return !this.customerId && this.channel === "online"; },
  },
  items: {
   type: [orderItemSchema],
   required: true,
   validate: { validator: (items) => items.length > 0, message: "Order requires items" },
  },
  shippingAddress: {
   type: shippingAddressSchema,
   required() { return this.channel === "online"; },
  },
  subtotal: { ...nonNegativeInteger, required: true },
  discount: { ...nonNegativeInteger, default: 0 },
  shippingFee: { ...nonNegativeInteger, default: 0 },
  total: { ...nonNegativeInteger, required: true },
  promotionCode: { type: String, trim: true, uppercase: true },
  paymentMethod: { type: String, enum: paymentMethods, required: true },
  paymentStatus: {
   type: String, enum: paymentStatuses,
   default() { return this.paymentMethod === "ONLINE" ? "pending" : "unpaid"; },
  },
  orderStatus: { type: String, enum: orderStatuses, default: "pending" },
  channel: { type: String, enum: ["online", "offline"], default: "online" },
  createdByStaffId: {
   type: mongoose.Schema.Types.ObjectId, ref: "User",
   required() { return this.channel === "offline"; },
  },
  creationRequestId: { type: String, select: false, immutable: true },
  creationRequestHash: { type: String, select: false, immutable: true },
  creationState: { type: String, enum: ["pending", "complete"] },
  shipping: {
   carrier: { type: String, trim: true },
   trackingNumber: { type: String, trim: true },
  },
  statusHistory: { type: [statusHistorySchema], default: [] },
 },
 { timestamps: true, bufferCommands: false },
);

orderSchema.pre("validate", function () {
 if (this.paymentMethod === "CASH" && this.channel !== "offline") {
  this.invalidate("paymentMethod", "Cash is only supported for offline orders");
 }
 const subtotal = this.items?.reduce((sum, item) => sum + item?.unitPrice * item?.qty, 0);
 if (this.subtotal !== subtotal) this.invalidate("subtotal", "Subtotal must match item snapshots");
 if (this.discount > this.subtotal) this.invalidate("discount", "Discount exceeds subtotal");
 if (this.total !== this.subtotal - this.discount + this.shippingFee) {
  this.invalidate("total", "Total must match subtotal, discount and shipping fee");
 }
 if (this.orderStatus === "shipping" && (!this.shipping?.carrier || !this.shipping?.trackingNumber)) {
  this.invalidate("shipping", "Shipping requires a carrier and tracking number");
 }
});
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1, createdAt: -1 });
orderSchema.index({ createdByStaffId: 1, creationRequestId: 1 }, {
 unique: true,
 partialFilterExpression: { creationRequestId: { $type: "string" } },
});

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
