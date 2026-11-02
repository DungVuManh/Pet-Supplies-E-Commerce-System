import mongoose from "mongoose";
import { nonNegativeInteger } from "./shared.schema.js";

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    price: { ...nonNegativeInteger, required: true },
    stock: { ...nonNegativeInteger, default: 0 },
    reservedStock: {
      ...nonNegativeInteger,
      default: 0,
      validate: [
        { validator: Number.isSafeInteger, message: "Must be a safe integer" },
        { validator(value) { return value <= this.stock; }, message: "Reserved stock exceeds stock" },
      ],
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    brand: { type: String, trim: true },
    petType: { type: String, required: true, trim: true },
    categoryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Products require at least one category",
      },
    },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    variants: {
      type: [variantSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0 && new Set(items.map((item) => item.sku)).size === items.length,
        message: "Products require variants with distinct SKUs",
      },
    },
    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { ...nonNegativeInteger, default: 0 },
    soldCount: { ...nonNegativeInteger },
  },
  { timestamps: true, bufferCommands: false },
);

productSchema.pre("validate", function () {
  if (Array.isArray(this.categoryIds) && this.categoryIds.length > 0) {
    const seen = new Set();
    this.categoryIds = this.categoryIds.filter((id) => {
      if (!id) return false;
      const key = String(id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
});

productSchema.virtual("categories", {
  ref: "Category",
  localField: "categoryIds",
  foreignField: "_id",
});

// The array validator also prevents duplicate SKUs within a single product.
productSchema.index({ "variants.sku": 1 }, { unique: true });
productSchema.index({ name: "text", description: "text", brand: "text" });
productSchema.index({ categoryIds: 1, isActive: 1 });
productSchema.index({ petType: 1, isActive: 1 });

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
