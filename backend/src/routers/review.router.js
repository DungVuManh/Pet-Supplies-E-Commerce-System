// =============================================================
// backend/src/routers/review.router.js
// Router API Đánh giá của tôi (My Reviews)
// Tích hợp upload ảnh qua Cloudinary với Multer memory storage
// =============================================================

import { Router } from "express";
import multer from "multer";
import {
  createReview,
  deleteReview,
  getMyReviews,
  updateReview,
  uploadReviewImages,
} from "../controllers/review.controller.js";
import {
  readCookies,
  requireAuth,
} from "../common/middlewares/auth.middleware.js";

const router = Router();

// Cấu hình Multer nhận tối đa 2 ảnh lưu trong RAM Buffer trước khi đẩy sang Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB mỗi ảnh
  fileFilter(_req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file hình ảnh (jpg, jpeg, png, webp)."));
    }
  },
});

// Toàn bộ các route dưới đây yêu cầu đăng nhập
router.use(readCookies);
router.use(requireAuth);

// 1. GET /api/v1/reviews/my-reviews - Lấy danh sách Chưa đánh giá & Đã đánh giá của user
router.get("/my-reviews", getMyReviews);

// 2. POST /api/v1/reviews/upload - Tải 1 hoặc 2 ảnh lên Cloudinary
router.post("/upload", upload.array("images", 2), uploadReviewImages);

// 3. POST /api/v1/reviews - Tạo đánh giá mới cho sản phẩm đã mua
router.post("/", createReview);

// 4. PUT /api/v1/reviews/:id - Cập nhật đánh giá của chính user (trong hạn 30 ngày)
router.put("/:id", updateReview);

// 5. DELETE /api/v1/reviews/:id - Xóa đánh giá của chính user
router.delete("/:id", deleteReview);

export default router;
