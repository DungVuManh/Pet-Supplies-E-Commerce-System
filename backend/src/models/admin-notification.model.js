import mongoose from "mongoose";

export const ADMIN_NOTIFICATION_TYPES = ["order", "stock", "system"];

// One shared entry for every Admin; read and saved state is kept per Admin.
const adminNotificationSchema = new mongoose.Schema(
 {
  type: { type: String, enum: ADMIN_NOTIFICATION_TYPES, required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  detail: { type: String, trim: true, maxlength: 1000 },
  // Admin route the notification opens, such as "/admin/orders?q=PA2610".
  targetHref: {
   type: String,
   trim: true,
   validate: { validator: (value) => /^\/admin(\/|\?|$)/.test(value), message: "targetHref must be an Admin path" },
  },
  // Business key of the source record (an order code or SKU), for deduplication and search.
  reference: { type: String, trim: true, maxlength: 100 },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
 },
 { collection: "adminNotifications", timestamps: true, bufferCommands: false },
);

adminNotificationSchema.index({ createdAt: -1 });
adminNotificationSchema.index({ type: 1, createdAt: -1 });
adminNotificationSchema.index({ type: 1, reference: 1, createdAt: -1 });

export const AdminNotification = mongoose.models.AdminNotification
 || mongoose.model("AdminNotification", adminNotificationSchema);
