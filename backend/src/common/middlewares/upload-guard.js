import { timingSafeEqual } from "node:crypto";
import { AppError } from "../errors/app-error.js";
import { cookieSettings } from "./auth.middleware.js";

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

/**
 * `protectMutation` for file uploads: the same allowed Origin and CSRF
 * cookie/header pair, but `multipart/form-data` instead of JSON. Put it before
 * `multer`, so a forged request is refused before its body is read.
 */
export function protectUpload(request, _response, next) {
 const { csrfName } = cookieSettings(request);
 if (!request.app.locals.config.CORS_ORIGIN.includes(request.get("origin"))) {
  throw new AppError("Nguồn yêu cầu không hợp lệ.", 403, "CSRF_INVALID");
 }
 const header = request.get("x-csrf-token") || "";
 const cookie = request.authCookies?.[csrfName] || "";
 if (!csrfPattern.test(header) || !csrfPattern.test(cookie) || !timingSafeEqual(Buffer.from(header), Buffer.from(cookie))) {
  throw new AppError("Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.", 403, "CSRF_INVALID");
 }
 if (!request.is("multipart/form-data")) {
  throw new AppError("Yêu cầu tải ảnh phải là multipart/form-data.", 415, "UNSUPPORTED_MEDIA_TYPE");
 }
 next();
}
