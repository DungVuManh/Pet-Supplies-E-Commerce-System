import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";

/**
 * Sets a product's `ratingAvg` (one decimal) and `ratingCount` from its published
 * reviews. Same calculation as the customer review flow in `review.controller.js`.
 */
export async function recomputeProductRating(productId) {
 const reviews = await Review.find({ productId, status: "published" }).select("rating").lean();
 const ratingCount = reviews.length;
 const ratingAvg = ratingCount > 0
  ? Number((reviews.reduce((sum, review) => sum + (review.rating || 5), 0) / ratingCount).toFixed(1))
  : 0;
 await Product.updateOne({ _id: productId }, { $set: { ratingAvg, ratingCount } });
}
