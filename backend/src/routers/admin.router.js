import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { protectMutation } from "../controllers/auth.controller.js";
import { protectUpload } from "../common/middlewares/upload-guard.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { listInventory } from "../controllers/inventory.controller.js";
import { createCategory, deleteCategory, getCategory, listCategories, updateCategory } from "../controllers/admin/category.controller.js";
import { createMasterData, deleteMasterData, getMasterData, listMasterData, listMasterDataOptions, updateMasterData } from "../controllers/admin/master-data.controller.js";
import { createProduct, deleteProduct, exportProducts, getProduct, hideProduct, listProducts, showProduct, updateProduct } from "../controllers/admin/product.controller.js";
import { exportOrders, getOrder, listOrders } from "../controllers/admin/order.controller.js";
import { getOverview } from "../controllers/admin/overview.controller.js";
import { listPermissions } from "../controllers/admin/permission.controller.js";
import { deleteReview, listReviews } from "../controllers/admin/review.controller.js";
import { readProductImages, uploadProductImages } from "../controllers/admin/upload.controller.js";
import { createUser, getUser, listUsers, lockUser, unlockUser, updateUser } from "../controllers/admin/user.controller.js";
import { createVoucher, deleteVoucher, disableVoucher, enableVoucher, getVoucher, listVouchers, updateVoucher } from "../controllers/admin/voucher.controller.js";
import {
  getStoreSettings,
  updateStoreSettings,
} from "../controllers/admin-settings.controller.js";
import { getAdminNotifications } from "../controllers/admin-notification.controller.js";
import { getAuditLog, listAuditLogs } from "../controllers/admin/audit-log.controller.js";
import { createPolicy, deletePolicy, getPolicy, listPolicies, updatePolicy } from "../controllers/admin/policy.controller.js";

// Mounted at /api/v1/admin. Every route requires an Admin session; mutations
// also add `protectMutation` (JSON, allowed Origin, and the CSRF pair).
const router = Router();
router.use(readCookies, requireAuth, requireRole("admin"));

router.get("/dashboard", dashboard);
router.get("/overview", getOverview);
router.get("/inventory", listInventory);
router.get("/categories", listCategories);
router.post("/categories", protectMutation, createCategory);
router.get("/categories/:code", getCategory);
router.patch("/categories/:code", protectMutation, updateCategory);
router.delete("/categories/:code", protectMutation, deleteCategory);
router.get("/master-data", listMasterData);
router.get("/master-data/options", listMasterDataOptions);
router.post("/master-data", protectMutation, createMasterData);
router.get("/master-data/:kind/:code", getMasterData);
router.patch("/master-data/:kind/:code", protectMutation, updateMasterData);
router.delete("/master-data/:kind/:code", protectMutation, deleteMasterData);
router.get("/orders", listOrders);
router.get("/orders/export", exportOrders);
router.get("/orders/:orderCode", getOrder);
router.get("/permissions", listPermissions);
router.get("/products", listProducts);
router.post("/products", protectMutation, createProduct);
// Before `/products/:sku`, so "export" is never read as a SKU.
router.get("/products/export", exportProducts);
router.get("/products/:sku", getProduct);
router.patch("/products/:sku", protectMutation, updateProduct);
router.delete("/products/:sku", protectMutation, deleteProduct);
router.post("/products/:sku/hide", protectMutation, hideProduct);
router.post("/products/:sku/show", protectMutation, showProduct);
router.get("/reviews", listReviews);
router.delete("/reviews/:id", protectMutation, deleteReview);
// Multipart, so it has its own Origin and CSRF guard, checked before the files are read.
router.post("/uploads/product-images", protectUpload, readProductImages, uploadProductImages);
router.get("/users", listUsers);
router.post("/users", protectMutation, createUser);
router.get("/users/:id", getUser);
router.patch("/users/:id", protectMutation, updateUser);
router.post("/users/:id/lock", protectMutation, lockUser);
router.post("/users/:id/unlock", protectMutation, unlockUser);
router.get("/vouchers", listVouchers);
router.post("/vouchers", protectMutation, createVoucher);
router.get("/vouchers/:code", getVoucher);
router.patch("/vouchers/:code", protectMutation, updateVoucher);
router.delete("/vouchers/:code", protectMutation, deleteVoucher);
router.post("/vouchers/:code/enable", protectMutation, enableVoucher);
router.post("/vouchers/:code/disable", protectMutation, disableVoucher);

// Admin Notifications API (Aggregate from Product, Order, Setting, AuditLog)
router.get("/notifications", getAdminNotifications);

// Store Settings API
router.get("/settings", getStoreSettings);
router.put("/settings", protectMutation, updateStoreSettings);
router.patch("/settings", protectMutation, updateStoreSettings);

// Store Policies API
router.get("/policies", listPolicies);
router.post("/policies", protectMutation, createPolicy);
router.get("/policies/:code", getPolicy);
router.put("/policies/:code", protectMutation, updatePolicy);
router.patch("/policies/:code", protectMutation, updatePolicy);
router.delete("/policies/:code", protectMutation, deletePolicy);

// System Audit Logs API (Read-only)
router.get("/audit-logs", listAuditLogs);
router.get("/audit-log", listAuditLogs);
router.get("/audit-logs/:id", getAuditLog);
router.get("/audit-log/:id", getAuditLog);

export default router;
