import { randomBytes, timingSafeEqual } from 'node:crypto';
import { parseCookie } from 'cookie';
import { AppError } from '../common/errors/app-error.js';
import { parseBody, registerSchema, sessionSchema } from '../validators/auth.schema.js';

export function createAuthController(config, service) {
  const secure = config.NODE_ENV === 'production';
  const sessionName = secure ? '__Host-petly-session' : 'petly-session';
  const csrfName = secure ? '__Host-petly-csrf' : 'petly-csrf';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

  function readCookies(request, _response, next) {
    request.authCookies = parseCookie(request.headers.cookie || '');
    next();
  }

  function csrf(request, response) {
    const previous = request.authCookies[csrfName];
    const csrfToken = csrfPattern.test(previous || '') ? previous : randomBytes(32).toString('base64url');
    response.cookie(csrfName, csrfToken, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
    response.json({ success: true, data: { csrfToken } });
  }

  function protectMutation(request, _response, next) {
    if (!config.CORS_ORIGIN.includes(request.get('origin'))) {
      throw new AppError('Nguồn yêu cầu không hợp lệ.', 403, 'CSRF_INVALID');
    }
    if (!request.is('application/json')) {
      throw new AppError('Yêu cầu phải sử dụng JSON.', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }
    const header = request.get('x-csrf-token') || '';
    const cookie = request.authCookies[csrfName] || '';
    if (!csrfPattern.test(header) || !csrfPattern.test(cookie)
      || !timingSafeEqual(Buffer.from(header), Buffer.from(cookie))) {
      throw new AppError('Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.', 403, 'CSRF_INVALID');
    }
    next();
  }

  function startSession(schema, register) {
    return async (request, response) => {
      const input = parseBody(schema, request.body);
      const result = await service.startSession(input, register);
      response.cookie(sessionName, result.cookie, {
        ...cookieOptions, ...(input.remember ? { maxAge: result.expiresIn } : {}),
      });
      response.json({ success: true, data: { user: result.user } });
    };
  }

  async function me(request, response) {
    try {
      const user = await service.currentUser(request.authCookies[sessionName]);
      response.json({ success: true, data: { user } });
    } catch (error) {
      if (error.statusCode === 401) response.clearCookie(sessionName, cookieOptions);
      throw error;
    }
  }

  function logout(_request, response) {
    response.clearCookie(sessionName, cookieOptions);
    response.status(204).end();
  }
  return { readCookies, csrf, protectMutation, me, logout,
    register: startSession(registerSchema, true), login: startSession(sessionSchema, false) };
}
