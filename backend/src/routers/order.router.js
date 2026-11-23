// =============================================================
// backend/src/routers/order.router.js
// Router API Đơn hàng: Tạo đơn hàng, Xóa đơn hàng, Lấy đơn hàng của tôi
// =============================================================

import { Router } from "express";
import multer from "multer";
import { AppError } from "../common/errors/app-error.js";
import {
  createOrder,
  cancelOrder,
  deleteOrder,
  getMyOrders,
  getOrderDetail,
  previewBuyNow,
  lookupOrder,
  reorderCompletedOrder,
} from "../controllers/order.controller.js";
import { confirmCustomerOrderReceipt } from "../controllers/order-status.controller.js";
import {
  convertCustomerOrderToCod,
  getCustomerOrderPayment,
  renewCustomerOrderPayment,
} from "../controllers/order-payment.controller.js";
import {
  protectMutation,
  protectMultipartMutation,
} from "../controllers/auth.controller.js";
import {
  uploadCustomerReturnImages,
  submitCustomerReturnRequest,
  confirmCustomerReturnShipped,
  cancelCustomerReturn,
  listCustomerReturns,
  getCustomerReturnDetail,
} from "../controllers/order-return.controller.js";
import {
  optionalAuth,
  readCookies,
  requireAuth,
  requireRole,
} from "../common/middlewares/auth.middleware.js";

const router = Router();

function noStore(_request, response, next) {
  response.set("Cache-Control", "no-store");
  next();
}

const returnImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
}).array("images", 5);

function handleReturnImageUpload(request, response, next) {
  returnImageUpload(request, response, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError("Mỗi hình ảnh không được vượt quá 5MB.", 400, "FILE_TOO_LARGE")
        );
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(
          new AppError("Chỉ được tải lên tối đa 5 ảnh cho mỗi yêu cầu.", 400, "TOO_MANY_FILES")
        );
      }
      return next(new AppError(err.message || "Lỗi tải ảnh lên.", 400, "UPLOAD_ERROR"));
    }
    next();
  });
}

// Hỗ trợ nhận diện user nếu đã đăng nhập qua cookie
router.use(readCookies);

// 1. GET /api/v1/orders/my-orders - Lấy danh sách đơn hàng của user đang đăng nhập
router.get("/my-orders", requireAuth, requireRole("customer"), getMyOrders);

// Tiếp tục thanh toán VietQR / gia hạn phiên / đổi sang COD (chủ sở hữu đơn hàng)
router.get(
  "/:id/payment",
  noStore,
  requireAuth,
  requireRole("customer"),
  getCustomerOrderPayment,
);
router.post(
  "/:id/payment/renew",
  noStore,
  requireAuth,
  requireRole("customer"),
  protectMutation,
  renewCustomerOrderPayment,
);
router.post(
  "/:id/payment/convert-to-cod",
  noStore,
  requireAuth,
  requireRole("customer"),
  protectMutation,
  convertCustomerOrderToCod,
);

// A customer can complete only their own online order after it is shipping.
router.patch(
  "/:id/receipt-confirmation",
  noStore,
  requireAuth,
  requireRole("customer"),
  protectMutation,
  confirmCustomerOrderReceipt,
);

// Reorder a completed order
router.post(
  "/:id/reorder",
  noStore,
  requireAuth,
  requireRole("customer"),
  protectMutation,
  reorderCompletedOrder,
);

// Customer return requests: upload proof images and submit request
router.post(
  "/:id/return/upload",
  noStore,
  requireAuth,
  requireRole("customer"),
  protectMultipartMutation,
  handleReturnImageUpload,
  uploadCustomerReturnImages,
);
router.post(
  "/:id/return",
  noStore,
  requireAuth,
  requireRole("customer"),
  protectMutation,
  submitCustomerReturnRequest,
);
router.post(
  "/:id/return/confirm-shipped",
  noStore,
  requireAuth,
  requireRole("customer"),
  protectMutation,
  confirmCustomerReturnShipped,
);
router.post("/:id/return/cancel", noStore, requireAuth, requireRole("customer"), protectMutation, cancelCustomerReturn);
router.get("/:id/returns", noStore, requireAuth, requireRole("customer"), listCustomerReturns);
router.get("/:id/returns/:requestId", noStore, requireAuth, requireRole("customer"), getCustomerReturnDetail);

// 1b. Tra cứu đơn hàng công khai theo mã đơn hàng và số điện thoại (Không bắt buộc đăng nhập)
router.get("/lookup", lookupOrder);
router.post("/lookup", lookupOrder);

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
