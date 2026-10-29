import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { listInventory } from "../controllers/inventory.controller.js";

// Mounted at /api/v1/admin. Every route requires an Admin session; mutations
// also add `protectMutation` (JSON, allowed Origin, and the CSRF pair).
const router = Router();
router.use(readCookies, requireAuth, requireRole("admin"));

router.get("/dashboard", dashboard);
router.get("/inventory", listInventory);

export default router;
