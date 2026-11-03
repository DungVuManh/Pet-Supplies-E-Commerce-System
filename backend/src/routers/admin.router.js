import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { protectMutation } from "../controllers/auth.controller.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { listInventory } from "../controllers/inventory.controller.js";
import { deleteCategory, getCategory, listCategories, updateCategory } from "../controllers/admin/category.controller.js";
import { listMasterData, listMasterDataOptions } from "../controllers/admin/master-data.controller.js";
import { deleteProduct, getProduct, hideProduct, listProducts, showProduct, updateProduct } from "../controllers/admin/product.controller.js";
import { listOrders } from "../controllers/admin/order.controller.js";
import { getOverview } from "../controllers/admin/overview.controller.js";
import { listPermissions } from "../controllers/admin/permission.controller.js";
import { getUser, listUsers, lockUser, unlockUser, updateUser } from "../controllers/admin/user.controller.js";
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
router.get("/overview", getOverview);
router.get("/inventory", listInventory);
router.get("/categories", listCategories);
router.get("/categories/:code", getCategory);
router.patch("/categories/:code", protectMutation, updateCategory);
router.delete("/categories/:code", protectMutation, deleteCategory);
router.get("/master-data", listMasterData);
router.get("/master-data/options", listMasterDataOptions);
router.get("/orders", listOrders);
router.get("/permissions", listPermissions);
router.get("/products", listProducts);
router.get("/products/:sku", getProduct);
router.patch("/products/:sku", protectMutation, updateProduct);
router.delete("/products/:sku", protectMutation, deleteProduct);
router.post("/products/:sku/hide", protectMutation, hideProduct);
router.post("/products/:sku/show", protectMutation, showProduct);
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id", protectMutation, updateUser);
router.post("/users/:id/lock", protectMutation, lockUser);
router.post("/users/:id/unlock", protectMutation, unlockUser);

// Admin Notifications API (Aggregate from Product, Order, Setting, AuditLog)
router.get("/notifications", getAdminNotifications);

// Store Settings API
router.get("/settings", getStoreSettings);
router.put("/settings", protectMutation, updateStoreSettings);
router.patch("/settings", protectMutation, updateStoreSettings);

export default router;
