import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { AppError } from "./common/errors/app-error.js";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";
import { notFoundMiddleware } from "./common/middlewares/not-found.middleware.js";
import { createOpenApiDocument } from "./docs/swagger.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
export function createApp(config, { authService } = {}) {
 const app = express();
 app.disable("x-powered-by");
 app.use('/api/v1/auth', (_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
 });
 app.use(
  helmet({
   // HTTP localhost docs must not have their asset URLs upgraded to HTTPS.
   contentSecurityPolicy: {
    directives: {
     "upgrade-insecure-requests": config.NODE_ENV === "production" ? [] : null,
    },
   },
  }),
 );
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
 app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(createOpenApiDocument(config)),
 );
 app.use('/api/v1/auth', createAuthRouter(config, authService));
 app.use(notFoundMiddleware);
 app.use(errorMiddleware);
 return app;
}
