import { Router } from "express";
import { MemoryStore, ipKeyGenerator, rateLimit } from "express-rate-limit";
import { AppError } from "../common/errors/app-error.js";
import { optionalAuth, readCookies } from "../common/middlewares/auth.middleware.js";
import { protectMutation } from "../controllers/auth.controller.js";
import { listPublicVouchers, quoteVoucher } from "../controllers/voucher.controller.js";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * The customer's address. Browser requests arrive through the local Next.js proxy, so every
 * customer shares the socket's address there; the proxy adds the real one last in
 * `X-Forwarded-For`. That header is only believed from the proxy, because anyone connecting
 * directly could write whatever they like in it.
 */
export function quoteClientKey(request) {
 const peer = request.socket?.remoteAddress ?? "";
 const forwarded = LOOPBACK.has(peer) ? String(request.get("x-forwarded-for") ?? "").split(",").at(-1).trim() : "";
 return ipKeyGenerator(forwarded || peer);
}

export const quoteLimitStore = new MemoryStore();

// The global limiter is off in app.js, and codes must not be guessable. Each router gets its own count.
const quoteLimiter = rateLimit({
 windowMs: 60 * 1000,
 // Local development reloads far more often than real clients.
 limit: (request) => (request.app.locals.config.NODE_ENV === "development" ? 1000 : 20),
 store: quoteLimitStore,
 standardHeaders: "draft-8",
 legacyHeaders: false,
 keyGenerator: quoteClientKey,
 validate: { xForwardedForHeader: false },
 handler: (_request, _response, next) => next(new AppError("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.", 429, "RATE_LIMITED")),
});

// Mounted at /api/v1/vouchers. Admin management lives in admin.router.js.
const router = Router();
router.use(readCookies);

router.get("/public", listPublicVouchers);
router.post("/quote", quoteLimiter, optionalAuth, protectMutation, quoteVoucher);

export default router;
