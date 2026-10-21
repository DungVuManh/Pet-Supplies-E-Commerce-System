import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
 {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  productIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], default: [] },
 },
 { timestamps: true, bufferCommands: false },
);

export const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);
