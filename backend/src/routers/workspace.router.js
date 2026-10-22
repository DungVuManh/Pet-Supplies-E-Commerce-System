import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { getStaffProducts, getProductBySku } from "../controllers/product.controller.js";

const router = Router();
router.get("/staff/dashboard", readCookies, requireAuth, requireRole("staff"), dashboard);
router.get("/staff/products", readCookies, requireAuth, requireRole("staff"), getStaffProducts);
router.get("/staff/products/:sku", readCookies, requireAuth, requireRole("staff"), getProductBySku);

router.get("/admin/dashboard", readCookies, requireAuth, requireRole("admin"), dashboard);

export default router;
