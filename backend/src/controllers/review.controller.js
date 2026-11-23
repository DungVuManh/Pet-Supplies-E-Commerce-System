// =============================================================
// backend/src/controllers/review.controller.js
// Controller xử lý Đánh giá của tôi (My Reviews) theo userId
// Tích hợp Cloudinary upload (1-2 ảnh), hạn đánh giá 30 ngày, hạn sửa 30 ngày
// =============================================================

import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import cloudinary, { configureCloudinary } from "../config/cloudinary.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";

// Hạn đánh giá: 30 ngày kể từ khi đơn hàng hoàn tất (completed)
export const REVIEW_WINDOW_DAYS = 30;

// Hạn sửa đánh giá: 30 ngày kể từ khi gửi đánh giá (createdAt)
export const EDIT_WINDOW_DAYS = 30;

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
 * - Tab "Đã đánh giá": các review có status: 'published' do người dùng viết kèm thông tin có được sửa không.
 */
export async function getMyReviews(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để xem đánh giá của bạn.", 401, "UNAUTHENTICATED");
    }

    const now = Date.now();
    const reviewWindowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const editWindowMs = EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    // 1. Lấy tất cả review đã published của user
    const publishedReviews = await Review.find({
      userId,
      status: "published",
    })
      .sort({ createdAt: -1 })
      .populate("productId", "name images price slug")
      .lean();

    // Map các review đã có:
    // a) Đối với review có orderId: ghi nhận chính xác theo cặp `${orderId}_${productId}`
    // b) Đối với review cũ chưa có orderId (legacy): đếm số lượng review đã viết theo productId
    const reviewedOrderProductSet = new Set();
    const legacyReviewCountByProduct = new Map();

    for (const r of publishedReviews) {
      const pId = r.productId?._id?.toString() || r.productId?.toString();
      if (!pId) continue;

      if (r.orderId) {
        reviewedOrderProductSet.add(`${r.orderId.toString()}_${pId}`);
      } else {
        const count = legacyReviewCountByProduct.get(pId) || 0;
        legacyReviewCountByProduct.set(pId, count + 1);
      }
    }

    const formattedReviewed = publishedReviews.map((r) => {
      const prod = r.productId || {};
      const sentAt = new Date(r.createdAt).getTime();
      const editDiffMs = now - sentAt;
      const canEdit = editDiffMs <= editWindowMs;
      const editDaysRemaining = Math.max(0, Math.ceil((editWindowMs - editDiffMs) / (24 * 60 * 60 * 1000)));

      return {
        _id: r._id.toString(),
        orderId: r.orderId ? r.orderId.toString() : undefined,
        productId: prod._id?.toString() || r.productId?.toString(),
        productName: prod.name || "Sản phẩm",
        productSlug: prod.slug || "",
        productImage: prod.images?.[0] || "/images/placeholder.png",
        rating: r.rating || 5,
        comment: r.comment || "",
        images: Array.isArray(r.images) ? r.images : [],
        status: r.status,
        canEdit,
        editDaysRemaining,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    // 2. Lấy các đơn hàng hoàn tất của user để tìm sản phẩm chưa đánh giá
    // Sắp xếp đơn hoàn tất: đơn cũ trước, đơn mới sau (để các review cũ legacy khớp với đơn cũ trước)
    const completedOrders = await Order.find({
      customerId: userId,
      orderStatus: "completed",
    })
      .sort({ updatedAt: 1, createdAt: 1 })
      .lean();

    // Thu thập danh sách sản phẩm cần kiểm tra hạn 30 ngày
    const unreviewedList = [];

    for (const order of completedOrders) {
      const completedAt = getOrderCompletedAt(order);
      const diffMs = now - completedAt.getTime();

      // Nếu đã quá hạn 30 ngày: bỏ qua, không cho hiển thị ở tab "Chưa đánh giá"
      if (diffMs > reviewWindowMs) {
        continue;
      }

      const daysRemaining = Math.max(0, Math.ceil((reviewWindowMs - diffMs) / (24 * 60 * 60 * 1000)));
      const orderIdStr = order._id.toString();

      // Để tránh lặp lại cùng 1 sản phẩm trong CÙNG 1 ĐƠN HÀNG (ví dụ mua 2 cái hoặc 2 variant)
      const handledInOrder = new Set();

      for (const item of order.items || []) {
        const prodId = item.productId?.toString();
        if (!prodId) continue;
        if (handledInOrder.has(prodId)) continue;
        handledInOrder.add(prodId);

        const orderProdKey = `${orderIdStr}_${prodId}`;

        // Nếu đơn hàng này cho sản phẩm này đã có review cụ thể có orderId -> đã đánh giá
        if (reviewedOrderProductSet.has(orderProdKey)) {
          continue;
        }

        // Nếu sản phẩm này có legacy review (chưa có orderId) -> khớp với đơn này và trừ count
        const legacyCount = legacyReviewCountByProduct.get(prodId) || 0;
        if (legacyCount > 0) {
          legacyReviewCountByProduct.set(prodId, legacyCount - 1);
          continue;
        }

        // Đơn này sản phẩm này CHƯA đánh giá!
        unreviewedList.push({
          orderId: orderIdStr,
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

    // Đảo lại để đơn hàng mới nhất lên đầu danh sách Chưa đánh giá
    unreviewedList.reverse();

    // Nếu các sản phẩm chưa có ảnh trực tiếp, bổ sung ảnh từ bảng Product
    const missingImageProdIds = unreviewedList
      .filter((u) => !u.productImage)
      .map((u) => u.productId);

    if (missingImageProdIds.length > 0) {
      const products = await Product.find({ _id: { $in: missingImageProdIds } })
        .select("images slug")
        .lean();
      const pMap = new Map(products.map((p) => [p._id.toString(), p]));

      for (const unreviewedItem of unreviewedList) {
        if (!unreviewedItem.productImage) {
          const prod = pMap.get(unreviewedItem.productId);
          if (prod) {
            unreviewedItem.productImage = prod.images?.[0] || "/images/placeholder.png";
            unreviewedItem.productSlug = prod.slug || "";
          } else {
            unreviewedItem.productImage = "/images/placeholder.png";
          }
        }
      }
    }

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
 * Kiểm tra nghiêm ngặt hạn 30 ngày từ lúc hoàn thành đơn
 */
export async function createReview(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để đánh giá sản phẩm.", 401, "UNAUTHENTICATED");
    }

    const { productId, orderId, rating, comment, images } = request.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError("Mã sản phẩm không hợp lệ.", 400, "INVALID_PRODUCT_ID");
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      throw new AppError("Số sao đánh giá phải từ 1 đến 5.", 400, "INVALID_RATING");
    }

    // Giới hạn tối đa 2 ảnh cho mỗi review
    const cleanImages = Array.isArray(images)
      ? images.filter((img) => typeof img === "string" && img.trim()).slice(0, 2)
      : [];

    let targetOrder = null;

    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      // 1a. Kiểm tra theo orderId được chỉ định
      targetOrder = await Order.findOne({
        _id: orderId,
        customerId: userId,
        orderStatus: "completed",
        "items.productId": productId,
      }).lean();

      if (!targetOrder) {
        throw new AppError(
          "Không tìm thấy đơn hàng hoàn tất hợp lệ chứa sản phẩm này.",
          403,
          "NOT_PURCHASED"
        );
      }

      // Kiểm tra xem đơn hàng này đã được đánh giá cho sản phẩm này chưa
      const existingReview = await Review.findOne({
        userId,
        productId,
        orderId: targetOrder._id,
      });

      if (existingReview) {
        throw new AppError(
          "Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi. Bạn có thể chỉnh sửa đánh giá hiện có trong thời hạn cho phép.",
          400,
          "ALREADY_REVIEWED"
        );
      }
    } else {
      // 1b. Nếu không truyền orderId: tìm đơn hàng completed gần nhất chưa được review
      const completedOrders = await Order.find({
        customerId: userId,
        orderStatus: "completed",
        "items.productId": productId,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

      if (!completedOrders || completedOrders.length === 0) {
        throw new AppError(
          "Chỉ khách hàng đã mua và nhận hàng thành công mới có thể đánh giá sản phẩm.",
          403,
          "NOT_PURCHASED"
        );
      }

      const existingReviews = await Review.find({ userId, productId }).lean();
      const reviewedOrderIds = new Set(
        existingReviews
          .filter((r) => r.orderId)
          .map((r) => r.orderId.toString())
      );
      const legacyReviewCount = existingReviews.filter((r) => !r.orderId).length;

      let remainingLegacyToSkip = legacyReviewCount;
      const sortedOldToNew = [...completedOrders].reverse();

      for (const ord of sortedOldToNew) {
        const ordIdStr = ord._id.toString();
        if (reviewedOrderIds.has(ordIdStr)) {
          continue;
        }
        if (remainingLegacyToSkip > 0) {
          remainingLegacyToSkip--;
          continue;
        }
        targetOrder = ord;
        break;
      }

      if (!targetOrder) {
        throw new AppError(
          "Bạn đã đánh giá cho các lần mua sản phẩm này rồi. Bạn có thể chỉnh sửa đánh giá hiện có trong thời hạn cho phép.",
          400,
          "ALREADY_REVIEWED"
        );
      }
    }

    // 2. Kiểm tra hạn 30 ngày kể từ khi đơn hàng completed
    const completedAt = getOrderCompletedAt(targetOrder);
    const diffMs = Date.now() - completedAt.getTime();
    const windowMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (diffMs > windowMs) {
      throw new AppError(
        `Đã quá thời hạn ${REVIEW_WINDOW_DAYS} ngày kể từ khi nhận hàng, không thể tạo đánh giá cho sản phẩm này nữa.`,
        400,
        "REVIEW_WINDOW_EXPIRED"
      );
    }

    // 3. Lưu review vào MongoDB kèm orderId
    const newReview = new Review({
      productId,
      orderId: targetOrder._id,
      userId,
      rating: numRating,
      comment: (comment || "").trim(),
      images: cleanImages,
      status: "published",
    });

    await newReview.save();

    // 5. Cập nhật lại ratingAvg và ratingCount cho Product
    await updateProductRatingStats(productId);

    response.status(201).json({
      success: true,
      message: "Cảm ơn bạn đã đánh giá sản phẩm!",
      data: { review: newReview },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. PUT /api/v1/reviews/:id
 * Chỉnh sửa đánh giá của chính người dùng
 * Kiểm tra nghiêm ngặt hạn 30 ngày kể từ khi gửi đánh giá (createdAt)
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

    // Kiểm tra hạn 30 ngày từ lúc gửi đánh giá (createdAt)
    const sentAt = new Date(review.createdAt).getTime();
    const diffMs = Date.now() - sentAt;
    const editWindowMs = EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (diffMs > editWindowMs) {
      throw new AppError(
        `Đã quá thời hạn ${EDIT_WINDOW_DAYS} ngày kể từ lúc gửi đánh giá, không thể chỉnh sửa nữa.`,
        400,
        "EDIT_WINDOW_EXPIRED"
      );
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
      review.images = images
        .filter((img) => typeof img === "string" && img.trim())
        .slice(0, 2);
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

/**
 * 5. POST /api/v1/reviews/upload
 * Tải lên 1 hoặc 2 ảnh lên Cloudinary an toàn qua backend
 * Không để lộ API_SECRET ra frontend
 */
export async function uploadReviewImages(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để tải ảnh.", 401, "UNAUTHENTICATED");
    }

    const files = request.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new AppError("Vui lòng chọn ít nhất 1 ảnh để tải lên.", 400, "NO_FILES");
    }

    if (files.length > 2) {
      throw new AppError("Mỗi đánh giá chỉ được tải lên tối đa 2 ảnh.", 400, "TOO_MANY_FILES");
    }

    const config = configureCloudinary();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.error("[Cloudinary] Thiếu cấu hình trong backend/.env:", config);
      throw new AppError(
        "Chưa cấu hình tài khoản Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) trong backend/.env.",
        500,
        "CLOUDINARY_CONFIG_MISSING"
      );
    }

    // Tải từng ảnh lên Cloudinary qua upload_stream từ Buffer bộ nhớ
    const uploadPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        try {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "petjoy/reviews",
              resource_type: "image",
            },
            (error, result) => {
              if (error) {
                console.error("[Cloudinary] Upload error:", error);
                const errorMsg =
                  error.message ||
                  (typeof error === "string" ? error : "Lỗi khi tải ảnh lên Cloudinary.");
                return reject(
                  new AppError(
                    `Lỗi Cloudinary: ${errorMsg}`,
                    400,
                    "CLOUDINARY_UPLOAD_ERROR"
                  )
                );
              }
              resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        } catch (syncErr) {
          console.error("[Cloudinary] Sync error:", syncErr);
          reject(
            new AppError(
              syncErr.message || "Không thể khởi tạo kết nối Cloudinary.",
              500,
              "UPLOAD_INIT_FAILED"
            )
          );
        }
      });
    });

    const urls = await Promise.all(uploadPromises);

    response.json({
      success: true,
      message: "Tải ảnh lên Cloudinary thành công!",
      data: { urls },
    });
  } catch (error) {
    next(error);
  }
}
