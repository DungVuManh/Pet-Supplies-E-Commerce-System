// =============================================================
// backend/src/routers/wishlist.router.js
// Router API Danh sách yêu thích (Wishlist)
// =============================================================

import { Router } from "express";
import {
  clearWishlist,
  getWishlist,
  removeWishlistItem,
  toggleWishlistItem,
  checkWishlistItem,
} from "../controllers/wishlist.controller.js";
import {
  optionalAuth,
  readCookies,
} from "../common/middlewares/auth.middleware.js";

const router = Router();

// Hỗ trợ đọc cookie xác thực người dùng
router.use(readCookies);
router.use(optionalAuth);

// 1. GET /api/v1/wishlist - Lấy danh sách sản phẩm yêu thích
router.get("/", getWishlist);

// 2. POST /api/v1/wishlist/toggle - Thêm hoặc Bỏ lưu sản phẩm
router.post("/toggle", toggleWishlistItem);

// 3. GET /api/v1/wishlist/check/:productId - Kiểm tra sản phẩm đã lưu chưa
router.get("/check/:productId", checkWishlistItem);

// 4. DELETE /api/v1/wishlist/items/:productId - Xóa 1 sản phẩm khỏi yêu thích
router.delete("/items/:productId", removeWishlistItem);

// 5. DELETE /api/v1/wishlist - Xóa toàn bộ danh sách yêu thích
router.delete("/", clearWishlist);

export default router;

