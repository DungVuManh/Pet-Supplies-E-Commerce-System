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
 },
 { timestamps: true, bufferCommands: false },
);

categorySchema.index({ petType: 1, isActive: 1 });

export const Category =
 mongoose.models.Category || mongoose.model("Category", categorySchema);
