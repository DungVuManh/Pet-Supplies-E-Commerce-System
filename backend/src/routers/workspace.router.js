import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { dashboard } from "../controllers/dashboard.controller.js";

const router = Router();
router.get("/staff/dashboard", readCookies, requireAuth, requireRole("staff"), dashboard);
router.get("/admin/dashboard", readCookies, requireAuth, requireRole("admin"), dashboard);

export default router;
