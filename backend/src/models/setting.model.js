import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, enum: ["global"], default: "global", immutable: true },
    lowStockThreshold: { ...nonNegativeInteger, default: 5 },
    shippingFee: { ...nonNegativeInteger, default: 0 },
    storeName: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, default: "" },
    hotline: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    timezone: { type: String, trim: true, default: "GMT+7 · Việt Nam" },
    currency: { type: String, trim: true, default: "VND – Việt Nam đồng" },
    standardShipping: { type: Boolean, default: true },
    expressShipping: { type: Boolean, default: false },
    freeShippingThreshold: { ...nonNegativeInteger, default: 0 },
    codPayment: { type: Boolean, default: true },
    bankTransfer: { type: Boolean, default: true },
    vnpay: { type: Boolean, default: false },
    bankCode: { type: String, trim: true, default: "MB" },
    accountNumber: { type: String, trim: true, default: "" },
    accountHolder: { type: String, trim: true, default: "" },
    emailOrderConfirmation: { type: Boolean, default: true },
    lowStockAlert: { type: Boolean, default: true },
    dailyRevenueReport: { type: Boolean, default: false },
    promoNotification: { type: Boolean, default: false },
  },
  { timestamps: true, bufferCommands: false },
);

export const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);
