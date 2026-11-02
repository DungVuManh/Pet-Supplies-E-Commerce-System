import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { listInventory } from "../controllers/inventory.controller.js";
import { protectMutation } from "../controllers/auth.controller.js";
import { getUser, listUsers, lockUser, unlockUser } from "../controllers/admin/user.controller.js";

// Mounted at /api/v1/admin. Every route requires an Admin session; mutations
// also add `protectMutation` (JSON, allowed Origin, and the CSRF pair).
const router = Router();
router.use(readCookies, requireAuth, requireRole("admin"));

router.get("/dashboard", dashboard);
router.get("/inventory", listInventory);
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.post("/users/:id/lock", protectMutation, lockUser);
router.post("/users/:id/unlock", protectMutation, unlockUser);

export default router;
