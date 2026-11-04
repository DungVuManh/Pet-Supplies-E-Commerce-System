// =============================================================
// backend/src/common/middlewares/sepay-auth.js
// Middleware xác thực bảo mật Webhook từ cổng thanh toán SePay
// =============================================================

import { AppError } from "../errors/app-error.js";

/**
 * Middleware kiểm tra API Key trong Header Authorization từ SePay
 * Cú pháp Header: Authorization: Apikey <SEPAY_API_KEY> hoặc Bearer <SEPAY_API_KEY>
 */
export function verifySepayWebhook(request, response, next) {
  try {
    const configuredApiKey =
      request.app?.locals?.config?.SEPAY_API_KEY ||
      process.env.SEPAY_API_KEY;

    // Nếu hệ thống đã cấu hình API Key thì bắt buộc phải kiểm tra
    if (configuredApiKey && configuredApiKey.trim() !== "") {
      const authHeader =
        request.headers["authorization"] ||
        request.headers["x-sepay-api-key"] ||
        "";

      // Trích xuất chuỗi token từ Authorization header
      const token = authHeader.replace(/^(Apikey|Bearer)\s+/i, "").trim();

      if (!token || token !== configuredApiKey.trim()) {
        throw new AppError(
          "Mã xác thực Webhook SePay không hợp lệ hoặc thiếu quyền truy cập.",
          401,
          "UNAUTHORIZED"
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

