import mongoose from "mongoose";

// VND amounts and stock counts must stay within JavaScript's exact integer range.
export const nonNegativeInteger = {
 type: Number,
 min: 0,
 validate: { validator: Number.isSafeInteger, message: "Must be a safe integer" },
};

export const addressFields = {
 recipientName: { type: String, required: true, trim: true },
 phone: { type: String, required: true, trim: true },
 province: { type: String, required: true, trim: true },
 district: { type: String, required: true, trim: true },
 ward: { type: String, required: true, trim: true },
 street: { type: String, required: true, trim: true },
};

export const shippingAddressSchema = new mongoose.Schema(addressFields, { _id: false });
export const paymentMethods = ["COD", "ONLINE", "CASH"];
export const paymentStatuses = ["unpaid", "pending", "paid", "failed"];
export const orderStatuses = [
 "pending", "confirmed", "processing", "shipping", "delivered", "completed", "cancelled",
];
