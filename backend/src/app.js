import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { AppError } from "./common/errors/app-error.js";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";
import { notFoundMiddleware } from "./common/middlewares/not-found.middleware.js";
import authRouter from "./routers/auth.router.js";
import workspaceRouter from "./routers/workspace.router.js";

export function createApp(config) {
 const app = express();
 app.locals.config = config;
 app.disable("x-powered-by");
 app.use(["/api/v1/auth", "/api/v1/staff", "/api/v1/admin"], (_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
 });
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
 app.use(
  "/api/v1",
  rateLimit({
   windowMs: 15 * 60 * 1000,
   limit: 100,
   standardHeaders: "draft-8",
   legacyHeaders: false,
   handler: (_request, _response, next) => {
    next(
     new AppError("Too many requests; try again later", 429, "RATE_LIMITED"),
    );
   },
  }),
 );
 app.use(express.json({ limit: "100kb" }));
 app.use(express.urlencoded({ extended: false, limit: "100kb" }));
 app.use("/api/v1/auth", authRouter);
 app.use("/api/v1", workspaceRouter);
 app.use(notFoundMiddleware);
 app.use(errorMiddleware);
 return app;
}
