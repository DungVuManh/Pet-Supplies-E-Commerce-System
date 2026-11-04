// =============================================================
// backend/src/routers/payment.router.js
// Định tuyến các API thanh toán SePay và VietQR
// =============================================================

import { Router } from "express";
import { verifySepayWebhook } from "../common/middlewares/sepay-auth.js";
import {
  convertToCod,
  getPaymentInfo,
  getPaymentStatus,
  handleSepayWebhook,
  renewPaymentSession,
} from "../controllers/payment.controller.js";

const paymentRouter = Router();

// 1. Điểm tiếp nhận Webhook từ SePay (yêu cầu verifySepayWebhook)
paymentRouter.post("/sepay/webhook", verifySepayWebhook, handleSepayWebhook);

// 2. Lấy thông tin VietQR động và chi tiết thanh toán cho đơn hàng
paymentRouter.get("/sepay/info/:orderCode", getPaymentInfo);

// 3. Truy vấn trạng thái thanh toán thời gian thực (phục vụ Polling 3s)
paymentRouter.get("/status/:orderCode", getPaymentStatus);

// 4. Gia hạn phiên thanh toán VietQR (thêm 15 phút)
paymentRouter.post("/renew-session/:orderCode", renewPaymentSession);

// 5. Chuyển đổi phương thức sang COD khi phiên QR hết hạn
paymentRouter.post("/convert-to-cod/:orderCode", convertToCod);

export default paymentRouter;

