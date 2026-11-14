import mongoose from "mongoose";
import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { paginate } from "../../common/pagination.js";
import { recomputeProductRating } from "../../common/product-rating.js";
import { searchFilter } from "../../common/search.js";
import { Product } from "../../models/product.model.js";
import { Review } from "../../models/review.model.js";
import { User } from "../../models/user.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { reviewListQuerySchema } from "../../validators/admin/review.validator.js";

const ROW_FIELDS = "productId userId rating comment images createdAt updatedAt";

const notFound = () => new AppError("Không tìm thấy đánh giá.", 404, "REVIEW_NOT_FOUND");

/** Avatars may be base64 data from the account page; only URLs and site paths go in a list. */
const listableAvatar = (url) => (typeof url === "string" && /^(https?:\/\/|\/)/.test(url) ? url : null);

const idsOf = async (Model, filter) => (await Model.find(filter).select("_id").lean()).map((row) => row._id);

/** Reviews whose comment, product name, or customer name holds every word of `q`. */
async function searchReviews(q) {
 const text = q.trim();
 const productFilter = searchFilter(text, ["name"]);
 // Text with no searchable word, such as "(", gives an empty filter, which must not mean every row.
 if (!Object.keys(productFilter).length) return {};
 const [productIds, userIds] = await Promise.all([idsOf(Product, productFilter), idsOf(User, searchFilter(text, ["fullName"]))]);
 return { $or: [searchFilter(text, ["comment"]), { productId: { $in: productIds } }, { userId: { $in: userIds } }] };
}

async function reviewFilter(query) {
 const conditions = [];
 if (query.rating !== "all") conditions.push({ rating: Number(query.rating) });
 const search = await searchReviews(query.q);
 if (Object.keys(search).length) conditions.push(search);
 return conditions.length ? { $and: conditions } : {};
}

async function byId(Model, ids, fields) {
 const unique = [...new Set(ids.filter(Boolean).map(String))];
 const rows = unique.length ? await Model.find({ _id: { $in: unique } }).select(fields).lean() : [];
 return new Map(rows.map((row) => [String(row._id), row]));
}

function reviewRow(review, products, users) {
 const product = products.get(String(review.productId));
 const user = users.get(String(review.userId));
 return {
  id: String(review._id),
  rating: review.rating,
  comment: review.comment ?? "",
  images: Array.isArray(review.images) ? review.images : [],
  createdAt: review.createdAt,
  // Saving a review always touches `updatedAt`, so only a later change counts as an edit.
  edited: Boolean(review.updatedAt && review.createdAt && new Date(review.updatedAt) - new Date(review.createdAt) > 1000),
  customer: { name: user?.fullName ?? "Khách hàng đã xóa", avatarUrl: listableAvatar(user?.avatarUrl) },
  // Admin product pages are keyed by a variant SKU.
  product: product ? { sku: product.variants?.[0]?.sku ?? null, name: product.name, image: product.images?.[0] ?? null } : null,
 };
}

/** Every customer review, newest first. */
export async function listReviews(request, response) {
 const query = parseQuery(reviewListQuerySchema, request.query);
 const page = await paginate(Review, await reviewFilter(query), query, { select: ROW_FIELDS });
 const [products, users] = await Promise.all([
  byId(Product, page.items.map((review) => review.productId), "name images variants.sku"),
  byId(User, page.items.map((review) => review.userId), "fullName avatarUrl"),
 ]);
 response.json({ success: true, data: { ...page, items: page.items.map((review) => reviewRow(review, products, users)) } });
}

/**
 * Removes a review for good and recalculates its product's rating. The audit entry
 * keeps the whole review, since nothing else does once it is gone.
 */
export async function deleteReview(request, response) {
 const { id } = request.params;
 if (!mongoose.Types.ObjectId.isValid(id)) throw notFound();
 const review = await Review.findById(id).lean();
 if (!review) throw notFound();

 // The customer may delete it between the read and this write.
 const { deletedCount } = await Review.deleteOne({ _id: review._id });
 if (!deletedCount) throw notFound();
 await recomputeProductRating(review.productId);

 const [product, user] = await Promise.all([
  Product.findById(review.productId).select("name variants.sku").lean(),
  User.findById(review.userId).select("fullName").lean(),
 ]);
 await recordAudit(request, {
  action: "review.delete",
  target: { collectionName: "reviews", id: review._id },
  before: {
   productId: String(review.productId), productSku: product?.variants?.[0]?.sku ?? null, productName: product?.name ?? null,
   userId: String(review.userId), customerName: user?.fullName ?? null,
   rating: review.rating, comment: review.comment, images: review.images, status: review.status,
   createdAt: review.createdAt, updatedAt: review.updatedAt,
  },
  summary: `Xóa đánh giá ${review.rating} sao của ${user?.fullName ?? "khách hàng"} về ${product?.name ?? "sản phẩm đã xóa"}`.slice(0, 300),
 });
 response.json({ success: true, data: { id: String(review._id) } });
}
