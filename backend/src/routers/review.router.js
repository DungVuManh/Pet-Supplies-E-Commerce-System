// =============================================================
// backend/src/routers/review.router.js
// Router API Đánh giá của tôi (My Reviews)
// =============================================================

import { Router } from "express";
import {
  createReview,
  deleteReview,
  getMyReviews,
  updateReview,
} from "../controllers/review.controller.js";
import {
  readCookies,
  requireAuth,
} from "../common/middlewares/auth.middleware.js";

const router = Router();

// Toàn bộ các route dưới đây yêu cầu đăng nhập
router.use(readCookies);
router.use(requireAuth);

// 1. GET /api/v1/reviews/my-reviews - Lấy danh sách Chưa đánh giá & Đã đánh giá của user
router.get("/my-reviews", getMyReviews);

// 2. POST /api/v1/reviews - Tạo đánh giá mới cho sản phẩm đã mua
router.post("/", createReview);

// 3. PUT /api/v1/reviews/:id - Cập nhật đánh giá của chính user
router.put("/:id", updateReview);

// 4. DELETE /api/v1/reviews/:id - Xóa đánh giá của chính user
router.delete("/:id", deleteReview);

export default router;

