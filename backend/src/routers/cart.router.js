
// Router API Giỏ hàng: Thêm, Lấy, Cập nhật và Xóa sản phẩm

import { Router } from "express";
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity,
} from "../controllers/cart.controller.js";
import { readCookies } from "../common/middlewares/auth.middleware.js";

const router = Router();

// Hỗ trợ đọc cookies để nhận diện session của user nếu đã đăng nhập
router.use(readCookies);

// 1. POST /api/v1/cart/items - Thêm sản phẩm vào giỏ
router.post("/items", addToCart);

// 2. GET /api/v1/cart - Lấy thông tin giỏ hàng
router.get("/", getCart);

// 3. PATCH /api/v1/cart/items/:sku - Cập nhật số lượng
router.patch("/items/:sku", updateCartItemQuantity);

// 4. DELETE /api/v1/cart/items/:sku - Xóa sản phẩm khỏi giỏ
router.delete("/items/:sku", removeCartItem);

export default router;
