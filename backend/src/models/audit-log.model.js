import mongoose from "mongoose";

const targetSchema = new mongoose.Schema(
 {
  collectionName: { type: String, required: true, trim: true },
  id: { type: String, required: true, trim: true },
 },
 { _id: false },
);
const auditLogSchema = new mongoose.Schema(
 {
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true, trim: true },
  target: { type: targetSchema, required: true },
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  at: { type: Date, required: true, default: Date.now },
 },
 { collection: "auditLogs", timestamps: true, bufferCommands: false },
);

auditLogSchema.index({ actorId: 1, at: -1 });
auditLogSchema.index({ "target.collectionName": 1, "target.id": 1, at: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
