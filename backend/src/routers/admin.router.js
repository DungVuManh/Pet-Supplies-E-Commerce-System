import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { protectMutation } from "../controllers/auth.controller.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { listInventory } from "../controllers/inventory.controller.js";
import {
  getStoreSettings,
  updateStoreSettings,
} from "../controllers/admin-settings.controller.js";
import { getAdminNotifications } from "../controllers/admin-notification.controller.js";

// Mounted at /api/v1/admin. Every route requires an Admin session; mutations
// also add `protectMutation` (JSON, allowed Origin, and the CSRF pair).
const router = Router();
router.use(readCookies, requireAuth, requireRole("admin"));

router.get("/dashboard", dashboard);
router.get("/inventory", listInventory);

// Admin Notifications API (Aggregate from Product, Order, Setting, AuditLog)
router.get("/notifications", getAdminNotifications);

// Store Settings API
router.get("/settings", getStoreSettings);
router.put("/settings", protectMutation, updateStoreSettings);
router.patch("/settings", protectMutation, updateStoreSettings);

export default router;
