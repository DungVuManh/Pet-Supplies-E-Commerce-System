// =============================================================
// backend/src/controllers/wishlist.controller.js
// Xử lý các nghiệp vụ Danh sách yêu thích (Wishlist) lưu vào MongoDB
// =============================================================

import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import { Product } from "../models/product.model.js";
import { Wishlist } from "../models/wishlist.model.js";
import { parseWishlistInput } from "../validators/wishlist.validator.js";

/**
 * 1. GET /api/v1/wishlist - Lấy danh sách sản phẩm yêu thích của người dùng
 */
export async function getWishlist(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      // Nếu khách vãng lai chưa đăng nhập
      return response.json({
        success: true,
        data: {
          items: [],
          total: 0,
          isGuest: true,
        },
      });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, productIds: [] });
    }

    // Populate thông tin chi tiết sản phẩm
    await wishlist.populate({
      path: "productIds",
      select: "name brand description images price variants ratingAvg ratingCount soldCount inStock isActive",
    });

    const formattedItems = (wishlist.productIds || [])
      .filter((p) => p && p.isActive !== false)
      .map((p) => {
        const prices = (p.variants || []).map((v) => v.price).filter((pr) => pr != null);
        const minPrice = prices.length > 0 ? Math.min(...prices) : (p.price || 0);
        const totalStock = (p.variants || []).reduce(
          (sum, v) => sum + Math.max(0, (v.stock || 0) - (v.reservedStock || 0)),
          0
        );

        return {
          _id: p._id.toString(),
          id: p._id.toString(),
          name: p.name,
          brand: p.brand || "Petjoy",
          description: p.description || "",
          image: p.images?.[0] || "/images/products/royal-canin-mini-adult.png",
          images: p.images || [],
          price: minPrice,
          ratingAvg: p.ratingAvg || 5.0,
          ratingCount: p.ratingCount || 0,
          soldCount: p.soldCount || 0,
          inStock: totalStock > 0 || !p.variants || p.variants.length === 0,
          sku: p.variants?.[0]?.sku || "",
        };
      });

    return response.json({
      success: true,
      data: {
        items: formattedItems,
        total: formattedItems.length,
        isGuest: false,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. POST /api/v1/wishlist/toggle - Bật/Tắt lưu sản phẩm vào Wishlist
 * Nếu sản phẩm đã có thì xóa, nếu chưa có thì thêm vào MongoDB
 */
export async function toggleWishlistItem(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để lưu sản phẩm vào danh sách yêu thích.", 401, "UNAUTHENTICATED");
    }

    const { productId } = parseWishlistInput(request.body);

    // Kiểm tra sản phẩm có tồn tại trong hệ thống không
    const product = await Product.findById(productId).lean();
    if (!product || product.isActive === false) {
      throw new AppError("Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.", 404, "NOT_FOUND");
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, productIds: [] });
    }

    const targetObjectId = new mongoose.Types.ObjectId(productId);
    const existingIndex = wishlist.productIds.findIndex(
      (id) => id.toString() === productId
    );

    let inWishlist = false;
    let message = "";

    if (existingIndex > -1) {
      // Đã có -> Bỏ lưu
      wishlist.productIds.splice(existingIndex, 1);
      inWishlist = false;
      message = "Đã bỏ lưu sản phẩm khỏi danh sách yêu thích.";
    } else {
      // Chưa có -> Lưu vào
      wishlist.productIds.push(targetObjectId);
      inWishlist = true;
      message = "Đã lưu sản phẩm vào danh sách yêu thích.";
    }

    await wishlist.save();

    return response.json({
      success: true,
      data: {
        productId,
        inWishlist,
        total: wishlist.productIds.length,
        message,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. DELETE /api/v1/wishlist/items/:productId - Xóa 1 sản phẩm khỏi Wishlist
 */
export async function removeWishlistItem(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để thực hiện chức năng này.", 401, "UNAUTHENTICATED");
    }

    const { productId } = request.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError("ID sản phẩm không hợp lệ.", 400, "VALIDATION_ERROR");
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (wishlist) {
      wishlist.productIds = wishlist.productIds.filter(
        (id) => id.toString() !== productId
      );
      await wishlist.save();
    }

    return response.json({
      success: true,
      data: {
        productId,
        inWishlist: false,
        total: wishlist ? wishlist.productIds.length : 0,
        message: "Đã xóa sản phẩm khỏi danh sách yêu thích.",
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. DELETE /api/v1/wishlist - Xóa toàn bộ sản phẩm trong Wishlist
 */
export async function clearWishlist(request, response, next) {
  try {
    const userId = request.user?._id;
    if (!userId) {
      throw new AppError("Vui lòng đăng nhập để thực hiện chức năng này.", 401, "UNAUTHENTICATED");
    }

    await Wishlist.findOneAndUpdate(
      { userId },
      { $set: { productIds: [] } },
      { upsert: true }
    );

    return response.json({
      success: true,
      data: {
        total: 0,
        message: "Đã xóa toàn bộ sản phẩm khỏi danh sách yêu thích.",
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. GET /api/v1/wishlist/check/:productId - Kiểm tra sản phẩm đã lưu chưa
 */
export async function checkWishlistItem(request, response, next) {
  try {
    const userId = request.user?._id;
    const { productId } = request.params;

    if (!userId || !productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return response.json({
        success: true,
        data: { inWishlist: false },
      });
    }

    const wishlist = await Wishlist.findOne({
      userId,
      productIds: new mongoose.Types.ObjectId(productId),
    }).lean();

    return response.json({
      success: true,
      data: { inWishlist: Boolean(wishlist) },
    });
  } catch (error) {
    next(error);
  }
}

