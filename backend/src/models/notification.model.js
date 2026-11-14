import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
 {
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, required: true, trim: true },
  channel: { type: String, required: true, trim: true, default: "in_app" },
  status: { type: String, enum: ["pending", "sent", "failed"], default: "sent" },
  title: { type: String, trim: true, default: "" },
  message: { type: String, trim: true, default: "" },
  link: { type: String, trim: true, default: "" },
  read: { type: Boolean, default: false },
  readAt: Date,
  error: String,
  sentAt: Date,
 },
 { timestamps: true, bufferCommands: false },
);

notificationSchema.pre("validate", function () {
 if (!this.userId && !this.orderId) {
  this.invalidate("userId", "Notification requires a user or an order");
 }
});
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ orderId: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
