import { AppError } from '../common/errors/app-error.js';
import { publicUser } from '../models/user.model.js';

export const DAY = 24 * 60 * 60 * 1000;

function firebaseError(error, operation) {
  const code = typeof error?.code === 'string' && /^[a-z-]+\/[a-z-]+$/.test(error.code)
    ? error.code : 'unknown';
  console.warn('[auth] Firebase request rejected', { operation, code });
  if (['auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token',
    'auth/argument-error', 'auth/user-disabled', 'auth/user-not-found',
    'auth/session-cookie-expired', 'auth/session-cookie-revoked', 'auth/invalid-session-cookie']
    .includes(error.code)) {
    return new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 401, 'UNAUTHENTICATED');
  }
  return new AppError('Chưa thể kết nối dịch vụ xác thực. Vui lòng thử lại.', 503, 'AUTH_UNAVAILABLE');
}

export function createAuthService({ getAuth, users, now = Date.now }) {
  async function verifyIdToken(idToken) {
    let claims;
    try { claims = await getAuth().verifyIdToken(idToken, true); }
    catch (error) { throw firebaseError(error, 'verify-id-token'); }
    const age = now() / 1000 - claims.auth_time;
    if (!Number.isFinite(age) || age < 0 || age >= 300) {
      console.warn('[auth] Recent sign-in check rejected', {
        reason: !Number.isFinite(age) ? 'missing-auth-time' : age < 0 ? 'server-clock-behind' : 'sign-in-too-old',
        ageSeconds: Number.isFinite(age) ? Math.round(age) : null,
      });
      if (age < 0) {
        throw new AppError('Thời gian máy chủ chưa đồng bộ.', 503, 'AUTH_CLOCK_SKEW');
      }
      throw new AppError('Vui lòng đăng nhập lại để tiếp tục.', 401, 'RECENT_LOGIN_REQUIRED');
    }
    if (claims.firebase?.sign_in_provider !== 'password' || typeof claims.email !== 'string') {
      throw new AppError('Vui lòng sử dụng email và mật khẩu.', 401, 'UNAUTHENTICATED');
    }
    return claims;
  }

  async function database(operation) {
    try { return await operation(); }
    catch { throw new AppError('Chưa thể lưu hoặc đọc hồ sơ. Vui lòng thử lại.', 503, 'PROFILE_UNAVAILABLE'); }
  }

  async function startSession(input, register = false) {
    const claims = await verifyIdToken(input.idToken);
    const user = await database(() => register
      ? users.createIfMissing(claims.uid, { email: claims.email, fullName: input.fullName, phone: input.phone })
      : users.findByUid(claims.uid));
    if (!user) throw new AppError('Vui lòng hoàn tất hồ sơ để tiếp tục.', 409, 'PROFILE_INCOMPLETE');
    const expiresIn = input.remember ? 14 * DAY : DAY;
    let cookie;
    try { cookie = await getAuth().createSessionCookie(input.idToken, { expiresIn }); }
    catch (error) { throw firebaseError(error, 'create-session-cookie'); }
    return { cookie, expiresIn, user: publicUser(user) };
  }

  async function currentUser(cookie) {
    if (!cookie) throw new AppError('Bạn chưa đăng nhập.', 401, 'UNAUTHENTICATED');
    let claims;
    try { claims = await getAuth().verifySessionCookie(cookie, true); }
    catch (error) { throw firebaseError(error, 'verify-session-cookie'); }
    const user = await database(() => users.findByUid(claims.uid));
    if (!user) throw new AppError('Vui lòng hoàn tất hồ sơ để tiếp tục.', 409, 'PROFILE_INCOMPLETE');
    return publicUser(user);
  }

  return { startSession, currentUser };
}
