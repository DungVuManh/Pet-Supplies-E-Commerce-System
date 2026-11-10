import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { AppError } from "./common/errors/app-error.js";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";
import { notFoundMiddleware } from "./common/middlewares/not-found.middleware.js";
import authRouter from "./routers/auth.router.js";
import catalogRouter from "./routers/catalog.router.js";
import accountRouter from "./routers/account.router.js";
import productRouter from "./routers/product.router.js";
import workspaceRouter from "./routers/workspace.router.js";
import adminRouter from "./routers/admin.router.js";
import cartRouter from "./routers/cart.router.js";
import orderRouter from "./routers/order.router.js";
import wishlistRouter from "./routers/wishlist.router.js";
import reviewRouter from "./routers/review.router.js";
import voucherRouter from "./routers/voucher.router.js";
import paymentRouter from "./routers/payment.router.js";
import customerVoucherRouter from "./routers/customer-voucher.router.js";

export function createApp(config) {
 const app = express();
 app.locals.config = config;
 app.disable("x-powered-by");
 app.use(
  ["/api/v1/auth", "/api/v1/account", "/api/v1/staff", "/api/v1/admin", "/api/v1/customer"],
  (_request, response, next) => {
   response.set("Cache-Control", "no-store");
   next();
  },
 );
 app.use(helmet());
 app.use(
  cors({
   origin(origin, callback) {
    if (!origin || config.CORS_ORIGIN.includes(origin)) {
     callback(null, true);
    } else {
     callback(new AppError("Origin is not allowed", 403, "CORS_FORBIDDEN"));
    }
   },
  }),
 );

 // Account updates carry base64 avatar images; every other route keeps the
 // small default. A body parsed here is skipped by the parsers below.
 app.use("/api/v1/account", express.json({ limit: "10mb" }));
 app.use(express.json({ limit: "100kb" }));
 app.use(express.urlencoded({ extended: false, limit: "100kb" }));
 app.use("/api/v1/auth", authRouter);
 app.use("/api/v1/account", accountRouter);
 app.use("/api/v1/products", productRouter);
 app.use("/api/v1/catalog", catalogRouter);
 app.use("/api/v1/cart", cartRouter);
 app.use("/api/v1/orders", orderRouter);
 app.use("/api/v1/payments", paymentRouter);
 app.use("/api/v1/wishlist", wishlistRouter);
 app.use("/api/v1/reviews", reviewRouter);
 app.use("/api/v1/vouchers", voucherRouter);
 app.use("/api/v1/promotions", voucherRouter);
 app.use("/api/v1/customer/vouchers", customerVoucherRouter);
 app.use("/api/v1/admin", adminRouter);
 app.use("/api/v1", workspaceRouter);
 app.use(notFoundMiddleware);
 app.use(errorMiddleware);
 return app;
}
