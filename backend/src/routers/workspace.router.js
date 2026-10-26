import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { getStaffSales } from "../controllers/staff-analytics.controller.js";
import { listStaffOrders, getStaffOrderDetail } from "../controllers/order.controller.js";
import { updateStaffOrderStatus } from "../controllers/order-status.controller.js";
import { getStaffProducts, getProductBySku } from "../controllers/product.controller.js";
import { updateStaffProduct } from "../controllers/product-update.controller.js";
import { protectMutation } from "../controllers/auth.controller.js";
import { createStaffSale, getSaleCreation, listSaleCustomers, listSaleProducts } from "../controllers/staff-sale.controller.js";

const router = Router();
router.get("/staff/analytics/sales", readCookies, requireAuth, requireRole("staff"), getStaffSales);
router.get("/staff/dashboard", readCookies, requireAuth, requireRole("staff"), dashboard);
router.get("/staff/orders", readCookies, requireAuth, requireRole("staff"), listStaffOrders);
router.post("/staff/orders", readCookies, requireAuth, requireRole("staff"), protectMutation, createStaffSale);
router.get("/staff/orders/creation/:requestId", readCookies, requireAuth, requireRole("staff"), getSaleCreation);
router.get("/staff/order-customers", readCookies, requireAuth, requireRole("staff"), listSaleCustomers);
router.get("/staff/order-products", readCookies, requireAuth, requireRole("staff"), listSaleProducts);
router.get("/staff/orders/:id", readCookies, requireAuth, requireRole("staff"), getStaffOrderDetail);
router.patch("/staff/orders/:id/status", readCookies, requireAuth, requireRole("staff"), protectMutation, updateStaffOrderStatus);
router.get("/staff/products", readCookies, requireAuth, requireRole("staff"), getStaffProducts);
router.get("/staff/products/:sku", readCookies, requireAuth, requireRole("staff"), getProductBySku);
router.patch("/staff/products/:sku", readCookies, requireAuth, requireRole("staff"), protectMutation, updateStaffProduct);

router.get("/admin/dashboard", readCookies, requireAuth, requireRole("admin"), dashboard);

export default router;
