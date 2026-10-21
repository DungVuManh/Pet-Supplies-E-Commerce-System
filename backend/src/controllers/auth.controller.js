import { randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "../common/errors/app-error.js";
import { getFirebaseAuth } from "../config/firebase.js";
import { publicUser, userRepository } from "../models/user.model.js";
import {
 parseBody,
 registerSchema,
 sessionSchema,
} from "../validators/auth.schema.js";

import { cookieSettings, firebaseError, database, validateUserRole } from "../common/middlewares/auth.middleware.js";

const DAY = 24 * 60 * 60 * 1000;

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

async function verifyIdToken(request, idToken) {
 let claims;
 try {
  claims = await getFirebaseAuth(request.app.locals.config).verifyIdToken(
   idToken,
   true,
  );
 } catch (error) {
  throw firebaseError(error, "verify-id-token");
 }
 const age = Date.now() / 1000 - claims.auth_time;
 if (!Number.isFinite(age) || age < 0 || age >= 300) {
  console.warn("[auth] Recent sign-in check rejected", {
   reason: !Number.isFinite(age)
    ? "missing-auth-time"
    : age < 0
      ? "server-clock-behind"
      : "sign-in-too-old",
   ageSeconds: Number.isFinite(age) ? Math.round(age) : null,
  });
  if (age < 0) {
   throw new AppError(
    "Thời gian máy chủ chưa đồng bộ.",
    503,
    "AUTH_CLOCK_SKEW",
   );
  }
  throw new AppError(
   "Vui lòng đăng nhập lại để tiếp tục.",
   401,
   "RECENT_LOGIN_REQUIRED",
  );
 }
 if (
  claims.firebase?.sign_in_provider !== "password" ||
  typeof claims.email !== "string"
 ) {
  throw new AppError(
   "Vui lòng sử dụng email và mật khẩu.",
   401,
   "UNAUTHENTICATED",
  );
 }
 return claims;
}

export function csrf(request, response) {
 const { csrfName, cookieOptions } = cookieSettings(request);
 const previous = request.authCookies[csrfName];
 const csrfToken = csrfPattern.test(previous || "")
  ? previous
  : randomBytes(32).toString("base64url");
 response.cookie(csrfName, csrfToken, {
  ...cookieOptions,
  maxAge: 60 * 60 * 1000,
 });
 response.json({ success: true, data: { csrfToken } });
}

export function protectMutation(request, _response, next) {
 const { csrfName } = cookieSettings(request);
 if (!request.app.locals.config.CORS_ORIGIN.includes(request.get("origin"))) {
  throw new AppError("Nguồn yêu cầu không hợp lệ.", 403, "CSRF_INVALID");
 }
 if (!request.is("application/json")) {
  throw new AppError(
   "Yêu cầu phải sử dụng JSON.",
   415,
   "UNSUPPORTED_MEDIA_TYPE",
  );
 }
 const header = request.get("x-csrf-token") || "";
 const cookie = request.authCookies[csrfName] || "";
 if (
  !csrfPattern.test(header) ||
  !csrfPattern.test(cookie) ||
  !timingSafeEqual(Buffer.from(header), Buffer.from(cookie))
 ) {
  throw new AppError(
   "Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.",
   403,
   "CSRF_INVALID",
  );
 }
 next();
}

async function sendSession(request, response, input, user) {
 if (!user) {
  throw new AppError(
   "Vui lòng hoàn tất hồ sơ để tiếp tục.",
   409,
   "PROFILE_INCOMPLETE",
  );
 }
 validateUserRole(user);
 const expiresIn = input.remember ? 14 * DAY : DAY;
 let cookie;
 try {
  cookie = await getFirebaseAuth(request.app.locals.config).createSessionCookie(
   input.idToken,
   { expiresIn },
  );
 } catch (error) {
  throw firebaseError(error, "create-session-cookie");
 }
 const profile = publicUser(user);
 const { sessionName, cookieOptions } = cookieSettings(request);
 response.cookie(sessionName, cookie, {
  ...cookieOptions,
  ...(input.remember ? { maxAge: expiresIn } : {}),
 });
 response.json({ success: true, data: { user: profile } });
}

export async function register(request, response) {
 const input = parseBody(registerSchema, request.body);
 const claims = await verifyIdToken(request, input.idToken);
 const user = await database(() =>
  userRepository.createIfMissing(claims.uid, {
   email: claims.email,
   fullName: input.fullName,
   phone: input.phone,
  }),
 );
 await sendSession(request, response, input, user);
}

export async function login(request, response) {
 const input = parseBody(sessionSchema, request.body);
 const claims = await verifyIdToken(request, input.idToken);
 const user = await database(() => userRepository.findByUid(claims.uid));
 await sendSession(request, response, input, user);
}

export function me(request, response) {
 response.json({ success: true, data: { user: publicUser(request.user) } });
}

export function logout(request, response) {
 const { sessionName, cookieOptions } = cookieSettings(request);
 response.clearCookie(sessionName, cookieOptions);
 response.status(204).end();
}
