// =============================================================
// backend/src/routers/order.router.js
// Router API Đơn hàng: Tạo đơn hàng và Xóa đơn hàng
// =============================================================

import { Router } from "express";
import { createOrder, deleteOrder } from "../controllers/order.controller.js";
import {
  optionalAuth,
  readCookies,
} from "../common/middlewares/auth.middleware.js";

const router = Router();

// Hỗ trợ nhận diện user nếu đã đăng nhập qua cookie
router.use(readCookies);

// 1. POST /api/v1/orders - Tạo đơn hàng (Mua ngay & Cart)
router.post("/", optionalAuth, createOrder);

// 2. DELETE /api/v1/orders/:id - Xóa đơn hàng khi hủy
router.delete("/:id", deleteOrder);

export default router;
