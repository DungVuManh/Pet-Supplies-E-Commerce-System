// =============================================================
// backend/src/routers/order.router.js
// Router API Đơn hàng: Tạo đơn hàng, Xóa đơn hàng, Lấy đơn hàng của tôi
// =============================================================

import { Router } from "express";
import {
  createOrder,
  cancelOrder,
  deleteOrder,
  getMyOrders,
  getOrderDetail,
  previewBuyNow,
} from "../controllers/order.controller.js";
import { confirmCustomerOrderReceipt } from "../controllers/order-status.controller.js";
import { protectMutation } from "../controllers/auth.controller.js";
import {
  optionalAuth,
  readCookies,
  requireAuth,
  requireRole,
} from "../common/middlewares/auth.middleware.js";

const router = Router();

// Hỗ trợ nhận diện user nếu đã đăng nhập qua cookie
router.use(readCookies);

// 1. GET /api/v1/orders/my-orders - Lấy danh sách đơn hàng của user đang đăng nhập
router.get("/my-orders", requireAuth, requireRole("customer"), getMyOrders);

// A customer can complete only their own online order after it is shipping.
router.patch(
  "/:id/receipt-confirmation",
  (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  },
  requireAuth,
  requireRole("customer"),
  protectMutation,
  confirmCustomerOrderReceipt,
);

// 2. GET /api/v1/orders/:id - Lấy chi tiết 1 đơn hàng (customer xem đơn của mình)
router.get("/:id", requireAuth, requireRole("customer"), getOrderDetail);

// 3. POST /api/v1/orders/buy-now-preview - Kiểm tra tính hợp lệ và tồn kho Mua ngay
router.post("/buy-now-preview", optionalAuth, previewBuyNow);

// 4. POST /api/v1/orders - Tạo đơn hàng (Mua ngay & Cart)
router.post("/", optionalAuth, createOrder);

// 5. PATCH /api/v1/orders/:id/cancel & DELETE /:id - Hủy đơn hàng (chuyển sang 'cancelled')
router.patch("/:id/cancel", cancelOrder);
router.delete("/:id", cancelOrder);

export default router;
