import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
 {
  name: { type: String, required: true, trim: true, unique: true },
  slug: {
   type: String,
   required: true,
   trim: true,
   lowercase: true,
   unique: true,
  },
  petType: {
   type: String,
   enum: ["dog", "cat", "both"],
   default: "both",
   trim: true,
  },
  isActive: { type: Boolean, default: true },
  // Admin category fields. Optional, so documents without them keep working everywhere else.
  code: { type: String, trim: true, uppercase: true, match: /^DM\d{3,}$/, unique: true, sparse: true },
  description: { type: String, trim: true, maxlength: 500 },
  displayOrder: { type: Number, min: 1, validate: { validator: Number.isSafeInteger, message: "Must be a safe integer" } },
 },
 { timestamps: true, bufferCommands: false },
);

categorySchema.index({ petType: 1, isActive: 1 });
categorySchema.index({ displayOrder: 1 });

export const Category =
 mongoose.models.Category || mongoose.model("Category", categorySchema);
