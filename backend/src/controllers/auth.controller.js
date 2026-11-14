import { randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "../common/errors/app-error.js";
import { getFirebaseAuth } from "../config/firebase.js";
import { publicUser, userRepository } from "../models/user.model.js";
import {
 parseBody,
 registerSchema,
 sessionSchema,
} from "../validators/auth.schema.js";

import { assertNotLocked, cookieSettings, firebaseError, database, validateUserRole } from "../common/middlewares/auth.middleware.js";

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
 const CLOCK_SKEW_TOLERANCE_SECONDS = 10;
 if (!Number.isFinite(age) || age < -CLOCK_SKEW_TOLERANCE_SECONDS || age >= 300) {
  console.warn("[auth] Recent sign-in check rejected", {
   reason: !Number.isFinite(age)
    ? "missing-auth-time"
    : age < -CLOCK_SKEW_TOLERANCE_SECONDS
      ? "server-clock-behind"
      : "sign-in-too-old",
   ageSeconds: Number.isFinite(age) ? Math.round(age) : null,
  });
  if (age < -CLOCK_SKEW_TOLERANCE_SECONDS) {
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
 const ALLOWED_SIGN_IN_PROVIDERS = new Set(["password", "google.com"]);
 if (
  !ALLOWED_SIGN_IN_PROVIDERS.has(claims.firebase?.sign_in_provider) ||
  typeof claims.email !== "string"
 ) {
  throw new AppError(
   "Phương thức đăng nhập không được hỗ trợ.",
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

function verifyOrigin(request) {
 const { csrfName } = cookieSettings(request);
 if (!request.app.locals.config.CORS_ORIGIN.includes(request.get("origin"))) {
  throw new AppError("Nguồn yêu cầu không hợp lệ.", 403, "CSRF_INVALID");
 }
}

function verifyCsrfToken(request) {
 const { csrfName } = cookieSettings(request);
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
}

export function protectMutation(request, _response, next) {
 verifyOrigin(request);
 if (!request.is("application/json")) {
  throw new AppError(
   "Yêu cầu phải sử dụng JSON.",
   415,
   "UNSUPPORTED_MEDIA_TYPE",
  );
 }
 verifyCsrfToken(request);
 next();
}

export function protectMultipartMutation(request, _response, next) {
 verifyOrigin(request);
 if (!request.is("multipart/form-data")) {
  throw new AppError(
   "Yêu cầu tải tệp phải sử dụng multipart/form-data.",
   415,
   "UNSUPPORTED_MEDIA_TYPE",
  );
 }
 verifyCsrfToken(request);
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
 assertNotLocked(user);
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
   ...(claims.picture ? { avatarUrl: claims.picture } : {}),
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
