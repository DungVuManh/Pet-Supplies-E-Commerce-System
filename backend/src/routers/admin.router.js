import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { protectMutation } from "../controllers/auth.controller.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { listInventory } from "../controllers/inventory.controller.js";
import { deleteCategory, listCategories } from "../controllers/admin/category.controller.js";
import { listPermissions } from "../controllers/admin/permission.controller.js";
import { getUser, listUsers, lockUser, unlockUser, updateUser } from "../controllers/admin/user.controller.js";
import {
  listAdminNotifications,
  markNotificationRead,
  markNotificationSaved,
  markAllNotificationsRead,
  createAdminNotification,
  deleteAdminNotification,
} from "../controllers/admin-notification.controller.js";

// Mounted at /api/v1/admin. Every route requires an Admin session; mutations
// also add `protectMutation` (JSON, allowed Origin, and the CSRF pair).
const router = Router();
router.use(readCookies, requireAuth, requireRole("admin"));

router.get("/dashboard", dashboard);
router.get("/inventory", listInventory);
router.get("/categories", listCategories);
router.delete("/categories/:code", protectMutation, deleteCategory);
router.get("/permissions", listPermissions);
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id", protectMutation, updateUser);
router.post("/users/:id/lock", protectMutation, lockUser);
router.post("/users/:id/unlock", protectMutation, unlockUser);

// Admin Notifications API
router.get("/notifications", listAdminNotifications);
router.post("/notifications", protectMutation, createAdminNotification);
router.post("/notifications/mark-all-read", protectMutation, markAllNotificationsRead);
router.patch("/notifications/:id/read", protectMutation, markNotificationRead);
router.patch("/notifications/:id/save", protectMutation, markNotificationSaved);
router.delete("/notifications/:id", protectMutation, deleteAdminNotification);

export default router;
