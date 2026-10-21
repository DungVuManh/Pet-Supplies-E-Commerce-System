import { parseCookie } from "cookie";
import { AppError } from "../errors/app-error.js";
import { getFirebaseAuth } from "../../config/firebase.js";
import { USER_ROLES, userRepository } from "../../models/user.model.js";

export function firebaseError(error, operation) {
 const code =
  typeof error?.code === "string" && /^[a-z-]+\/[a-z-]+$/.test(error.code)
   ? error.code
   : "unknown";
 console.warn("[auth] Firebase request rejected", { operation, code });
 if ([
  "auth/id-token-expired", "auth/id-token-revoked", "auth/invalid-id-token",
  "auth/argument-error", "auth/user-disabled", "auth/user-not-found",
  "auth/session-cookie-expired", "auth/session-cookie-revoked", "auth/invalid-session-cookie",
 ].includes(code)) {
  return new AppError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", 401, "UNAUTHENTICATED");
 }
 return new AppError("Chưa thể kết nối dịch vụ xác thực. Vui lòng thử lại.", 503, "AUTH_UNAVAILABLE");
}

export function cookieSettings(request) {
 const secure = request.app.locals.config.NODE_ENV === "production";
 return {
  sessionName: secure ? "__Host-petly-session" : "petly-session",
  csrfName: secure ? "__Host-petly-csrf" : "petly-csrf",
  cookieOptions: { httpOnly: true, secure, sameSite: "lax", path: "/" },
 };
}

export async function database(operation) {
 try {
  return await operation();
 } catch {
  throw new AppError("Chưa thể lưu hoặc đọc hồ sơ. Vui lòng thử lại.", 503, "PROFILE_UNAVAILABLE");
 }
}

export function readCookies(request, _response, next) {
 request.authCookies = parseCookie(request.headers.cookie || "");
 next();
}

export function validateUserRole(user) {
 if (!USER_ROLES.includes(user.role)) {
  throw new AppError("Bạn không có quyền truy cập chức năng này.", 403, "FORBIDDEN");
 }
}

export async function requireAuth(request, response, next) {
 const { sessionName, cookieOptions } = cookieSettings(request);
 try {
  const cookie = request.authCookies[sessionName];
  if (!cookie) throw new AppError("Bạn chưa đăng nhập.", 401, "UNAUTHENTICATED");
  let claims;
  try {
   claims = await getFirebaseAuth(request.app.locals.config).verifySessionCookie(cookie, true);
  } catch (error) {
   throw firebaseError(error, "verify-session-cookie");
  }
  const user = await database(() => userRepository.findByUid(claims.uid));
  if (!user) {
   throw new AppError("Vui lòng hoàn tất hồ sơ để tiếp tục.", 409, "PROFILE_INCOMPLETE");
  }
  validateUserRole(user);
  request.user = user;
 } catch (error) {
  if (error.statusCode === 401) response.clearCookie(sessionName, cookieOptions);
  throw error;
 }
 next();
}

export function requireRole(role) {
 return (request, _response, next) => {
  if (!request.user) throw new AppError("Bạn chưa đăng nhập.", 401, "UNAUTHENTICATED");
  if (!USER_ROLES.includes(role) || request.user.role !== role) {
   throw new AppError("Bạn không có quyền truy cập chức năng này.", 403, "FORBIDDEN");
  }
  next();
 };
}
