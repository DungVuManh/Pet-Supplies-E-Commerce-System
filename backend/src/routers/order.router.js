// =============================================================
// backend/src/routers/order.router.js
// Router API Đơn hàng: Tạo đơn hàng, Xóa đơn hàng, Lấy đơn hàng của tôi
// =============================================================

import { Router } from "express";
import { createOrder, cancelOrder, deleteOrder, getMyOrders, getOrderDetail } from "../controllers/order.controller.js";
import {
  optionalAuth,
  readCookies,
} from "../common/middlewares/auth.middleware.js";

const router = Router();

// Hỗ trợ nhận diện user nếu đã đăng nhập qua cookie
router.use(readCookies);

// 1. GET /api/v1/orders/my-orders - Lấy danh sách đơn hàng của user đang đăng nhập
router.get("/my-orders", optionalAuth, getMyOrders);

// 2. GET /api/v1/orders/:id - Lấy chi tiết 1 đơn hàng (customer xem đơn của mình)
router.get("/:id", optionalAuth, getOrderDetail);

// 3. POST /api/v1/orders - Tạo đơn hàng (Mua ngay & Cart)
router.post("/", optionalAuth, createOrder);

// 4. PATCH /api/v1/orders/:id/cancel & DELETE /:id - Hủy đơn hàng (chuyển sang 'cancelled')
router.patch("/:id/cancel", cancelOrder);
router.delete("/:id", cancelOrder);

export default router;
