import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
 {
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, required: true, trim: true },
  channel: { type: String, required: true, trim: true },
  status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
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
notificationSchema.index({ orderId: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
