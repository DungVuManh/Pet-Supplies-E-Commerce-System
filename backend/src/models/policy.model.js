import mongoose from "mongoose";

export const POLICY_STATUSES = ["published", "draft", "suspended"];

const policySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    id: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, maxlength: 20000, default: "" },
    status: { type: String, enum: POLICY_STATUSES, default: "published" },
    effectiveDate: { type: String, trim: true, default: "01/10/2026" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { collection: "policies", timestamps: true, bufferCommands: false }
);

policySchema.index({ code: 1 }, { unique: true });
policySchema.index({ id: 1 }, { unique: true });

export const Policy = mongoose.models.Policy || mongoose.model("Policy", policySchema);
