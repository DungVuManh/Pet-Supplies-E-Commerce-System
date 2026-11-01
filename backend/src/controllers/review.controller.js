// =============================================================
// backend/src/controllers/review.controller.js
// Controller xử lý Đánh giá của tôi (My Reviews) theo userId
// =============================================================

import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";

// Hạn đánh giá trong 30 ngày kể từ khi đơn hàng hoàn tất (completed)
export const REVIEW_WINDOW_DAYS = 30;

/**
 * Tính ngày hoàn tất của một đơn hàng
 */
function getOrderCompletedAt(order) {
  const completedHistory = (order.statusHistory || []).find((h) => h.to === "completed");
  if (completedHistory && completedHistory.at) {
    return new Date(completedHistory.at);
  }
  return new Date(order.updatedAt || order.createdAt);
}

/**
 * Cập nhật điểm trung bình (ratingAvg) và số lượng đánh giá (ratingCount) của sản phẩm
 */
async function updateProductRatingStats(productId) {
  try {
    const reviews = await Review.find({ productId, status: "published" }).select("rating").lean();
    const ratingCount = reviews.length;
    const ratingAvg = ratingCount > 0
      ? Number((reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / ratingCount).toFixed(1))
      : 0;

    await Product.updateOne({ _id: productId }, { $set: { ratingAvg, ratingCount } });
  } catch (error) {
    console.error("[updateProductRatingStats] Lỗi cập nhật rating sản phẩm:", error);
  }
}

/**
 * 1. GET /api/v1/reviews/my-reviews
 * Lấy danh sách đánh giá của chính người dùng đang đăng nhập:
 * - Tab "Chưa đánh giá": các sản phẩm đã mua từ đơn hàng 'completed' trong vòng 30 ngày chưa có review.
 * - Tab "Đã đánh giá": các review có status: 'published' do người dùng viết.
 */
export async function getMyReviews(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để xem đánh giá của bạn.", 401, "UNAUTHENTICATED");
    }

    const now = Date.now();
    const windowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    // 1. Lấy tất cả review đã published của user
    const publishedReviews = await Review.find({
      userId,
      status: "published",
    })
      .sort({ createdAt: -1 })
      .populate("productId", "name images price slug")
      .lean();

    const reviewedProductIds = new Set(
      publishedReviews.map((r) => r.productId?._id?.toString() || r.productId?.toString())
    );

    const formattedReviewed = publishedReviews.map((r) => {
      const prod = r.productId || {};
      return {
        _id: r._id.toString(),
        productId: prod._id?.toString() || r.productId?.toString(),
        productName: prod.name || "Sản phẩm",
        productSlug: prod.slug || "",
        productImage: prod.images?.[0] || "/images/placeholder.png",
        rating: r.rating || 5,
        comment: r.comment || "",
        images: Array.isArray(r.images) ? r.images : [],
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    // 2. Lấy các đơn hàng hoàn tất của user để tìm sản phẩm chưa đánh giá
    const completedOrders = await Order.find({
      customerId: userId,
      orderStatus: "completed",
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    // Thu thập danh sách sản phẩm cần kiểm tra hạn 30 ngày
    const unreviewedMap = new Map(); // Key: productId -> Unreviewed item

    for (const order of completedOrders) {
      const completedAt = getOrderCompletedAt(order);
      const diffMs = now - completedAt.getTime();

      // Nếu đã quá hạn 30 ngày: bỏ qua, không cho hiển thị ở tab "Chưa đánh giá"
      if (diffMs > windowMs) {
        continue;
      }

      const daysRemaining = Math.max(0, Math.ceil((windowMs - diffMs) / (24 * 60 * 60 * 1000)));

      for (const item of order.items || []) {
        const prodId = item.productId?.toString();
        if (!prodId) continue;

        // Nếu sản phẩm này user đã viết review rồi -> bỏ qua
        if (reviewedProductIds.has(prodId)) {
          continue;
        }

        // Nếu cùng sản phẩm trong nhiều đơn, giữ đơn mới nhất (daysRemaining lớn nhất)
        if (!unreviewedMap.has(prodId)) {
          unreviewedMap.set(prodId, {
            orderId: order._id.toString(),
            orderCode: order.orderCode,
            completedAt: completedAt.toISOString(),
            daysRemaining,
            productId: prodId,
            productName: item.name,
            productImage: item.image || "",
            variantSku: item.variantSku,
            price: item.unitPrice,
          });
        }
      }
    }

    // Nếu các sản phẩm chưa có ảnh trực tiếp, bổ sung ảnh từ bảng Product
    const missingImageProdIds = Array.from(unreviewedMap.values())
      .filter((u) => !u.productImage)
      .map((u) => u.productId);

    if (missingImageProdIds.length > 0) {
      const products = await Product.find({ _id: { $in: missingImageProdIds } })
        .select("images slug")
        .lean();
      const pMap = new Map(products.map((p) => [p._id.toString(), p]));

      for (const [prodId, unreviewedItem] of unreviewedMap.entries()) {
        const prod = pMap.get(prodId);
        if (prod) {
          unreviewedItem.productImage = prod.images?.[0] || "/images/placeholder.png";
          unreviewedItem.productSlug = prod.slug || "";
        } else {
          unreviewedItem.productImage = "/images/placeholder.png";
        }
      }
    }

    const unreviewedList = Array.from(unreviewedMap.values());

    response.json({
      success: true,
      data: {
        unreviewed: unreviewedList,
        reviewed: formattedReviewed,
        counts: {
          unreviewed: unreviewedList.length,
          reviewed: formattedReviewed.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. POST /api/v1/reviews
 * Tạo đánh giá mới cho sản phẩm đã mua
 */
export async function createReview(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để đánh giá sản phẩm.", 401, "UNAUTHENTICATED");
    }

    const { productId, rating, comment, images } = request.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError("Mã sản phẩm không hợp lệ.", 400, "INVALID_PRODUCT_ID");
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      throw new AppError("Số sao đánh giá phải từ 1 đến 5.", 400, "INVALID_RATING");
    }

    // 1. Kiểm tra đơn hàng hoàn tất của user chứa sản phẩm này
    const order = await Order.findOne({
      customerId: userId,
      orderStatus: "completed",
      "items.productId": productId,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    if (!order) {
      throw new AppError(
        "Chỉ khách hàng đã mua và nhận hàng thành công mới có thể đánh giá sản phẩm.",
        403,
        "NOT_PURCHASED"
      );
    }

    // 2. Kiểm tra hạn 30 ngày kể từ khi đơn hàng completed
    const completedAt = getOrderCompletedAt(order);
    const diffMs = Date.now() - completedAt.getTime();
    const windowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (diffMs > windowMs) {
      throw new AppError(
        `Đã quá thời hạn ${REVIEW_WINDOW_DAYS} ngày kể từ khi nhận hàng, không thể tạo đánh giá cho sản phẩm này nữa.`,
        400,
        "REVIEW_WINDOW_EXPIRED"
      );
    }

    // 3. Kiểm tra xem người dùng đã đánh giá sản phẩm này trước đó chưa
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      throw new AppError(
        "Bạn đã đánh giá sản phẩm này rồi. Bạn có thể chỉnh sửa đánh giá hiện có.",
        400,
        "ALREADY_REVIEWED"
      );
    }

    // 4. Lưu review vào MongoDB
    const newReview = new Review({
      productId,
      userId,
      rating: numRating,
      comment: (comment || "").trim(),
      images: Array.isArray(images) ? images.filter((img) => typeof img === "string" && img.trim()) : [],
      status: "published",
    });

    await newReview.save();

    // 5. Cập nhật lại ratingAvg và ratingCount cho Product
    await updateProductRatingStats(productId);

    response.status(201).json({
      success: true,
      message: "Gửi đánh giá sản phẩm thành công!",
      data: { review: newReview },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. PUT /api/v1/reviews/:id
 * Chỉnh sửa đánh giá của chính người dùng
 */
export async function updateReview(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để cập nhật đánh giá.", 401, "UNAUTHENTICATED");
    }

    const { id } = request.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Mã đánh giá không hợp lệ.", 400, "INVALID_REVIEW_ID");
    }

    const { rating, comment, images } = request.body;

    const review = await Review.findById(id);
    if (!review) {
      throw new AppError("Không tìm thấy đánh giá.", 404, "REVIEW_NOT_FOUND");
    }

    // Kiểm tra quyền sở hữu review
    if (String(review.userId) !== String(userId)) {
      throw new AppError("Bạn không có quyền chỉnh sửa đánh giá này.", 403, "FORBIDDEN");
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        throw new AppError("Số sao đánh giá phải từ 1 đến 5.", 400, "INVALID_RATING");
      }
      review.rating = numRating;
    }

    if (comment !== undefined) {
      review.comment = String(comment).trim();
    }

    if (images !== undefined && Array.isArray(images)) {
      review.images = images.filter((img) => typeof img === "string" && img.trim());
    }

    review.status = "published";
    await review.save();

    // Cập nhật lại ratingAvg cho Product
    await updateProductRatingStats(review.productId);

    response.json({
      success: true,
      message: "Cập nhật đánh giá thành công!",
      data: { review },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. DELETE /api/v1/reviews/:id
 * Xóa đánh giá của chính người dùng
 */
export async function deleteReview(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để xóa đánh giá.", 401, "UNAUTHENTICATED");
    }

    const { id } = request.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Mã đánh giá không hợp lệ.", 400, "INVALID_REVIEW_ID");
    }

    const review = await Review.findById(id);
    if (!review) {
      throw new AppError("Không tìm thấy đánh giá cần xóa.", 404, "REVIEW_NOT_FOUND");
    }

    // Kiểm tra quyền sở hữu review
    if (String(review.userId) !== String(userId)) {
      throw new AppError("Bạn không có quyền xóa đánh giá này.", 403, "FORBIDDEN");
    }

    const productId = review.productId;
    await Review.deleteOne({ _id: id });

    // Cập nhật lại ratingAvg và ratingCount cho Product
    await updateProductRatingStats(productId);

    response.json({
      success: true,
      message: "Xóa đánh giá thành công!",
    });
  } catch (error) {
    next(error);
  }
}

