import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
 {
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  isActive: { type: Boolean, default: true },
 },
 { timestamps: true, bufferCommands: false },
);

export const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
