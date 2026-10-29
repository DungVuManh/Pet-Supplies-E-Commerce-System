import mongoose from "mongoose";

export const AUDIT_RESULTS = ["success", "denied"];

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
  ip: { type: String, trim: true, maxlength: 64 },
  result: { type: String, enum: AUDIT_RESULTS, default: "success" },
  // Short Vietnamese description shown in the Admin audit log.
  summary: { type: String, trim: true, maxlength: 300 },
  at: { type: Date, required: true, default: Date.now },
 },
 { collection: "auditLogs", timestamps: true, bufferCommands: false },
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ actorId: 1, at: -1 });
auditLogSchema.index({ "target.collectionName": 1, "target.id": 1, at: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
