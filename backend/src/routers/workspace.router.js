import { Router } from "express";
import { readCookies, requireAuth, requireRole } from "../common/middlewares/auth.middleware.js";
import { dashboard } from "../controllers/dashboard.controller.js";
import { getStaffSales, getStaffPerformance, getStaffOverview } from "../controllers/staff-analytics.controller.js";
import { listStaffOrders, getStaffOrderDetail } from "../controllers/order.controller.js";
import { getStaffOrderInvoice, recordStaffOrderInvoiceExport } from "../controllers/order-invoice.controller.js";
import { updateStaffOrderStatus } from "../controllers/order-status.controller.js";
import { getStaffProducts, getProductBySku } from "../controllers/product.controller.js";
import { updateStaffProduct } from "../controllers/product-update.controller.js";
import {
  listStaffReturns,
  getStaffReturnDetail,
  decideStaffReturn,
} from "../controllers/order-return.controller.js";
import { protectMutation } from "../controllers/auth.controller.js";
import { createStaffSale, getSaleCreation, listSaleCustomers, listSaleProducts } from "../controllers/staff-sale.controller.js";
import { listInventory } from "../controllers/inventory.controller.js";
import { getFinanceSummary } from "../controllers/admin-finance.controller.js";
import { getSalesSummary } from "../controllers/admin-sales.controller.js";
import { getInventoryReport } from "../controllers/admin-inventory-report.controller.js";

const router = Router();
router.get("/staff/analytics/sales", readCookies, requireAuth, requireRole("staff"), getStaffSales);
router.get("/staff/analytics/performance", readCookies, requireAuth, requireRole("staff"), getStaffPerformance);
router.get("/staff/analytics/overview", readCookies, requireAuth, requireRole("staff"), getStaffOverview);
router.get("/staff/dashboard", readCookies, requireAuth, requireRole("staff"), dashboard);
router.get("/staff/orders", readCookies, requireAuth, requireRole("staff"), listStaffOrders);
router.post("/staff/orders", readCookies, requireAuth, requireRole("staff"), protectMutation, createStaffSale);
router.get("/staff/orders/creation/:requestId", readCookies, requireAuth, requireRole("staff"), getSaleCreation);
router.get("/staff/order-customers", readCookies, requireAuth, requireRole("staff"), listSaleCustomers);
router.get("/staff/order-products", readCookies, requireAuth, requireRole("staff"), listSaleProducts);
router.get("/staff/orders/:id", readCookies, requireAuth, requireRole("staff"), getStaffOrderDetail);
router.get("/staff/orders/:id/invoice", readCookies, requireAuth, requireRole("staff"), getStaffOrderInvoice);
router.post("/staff/orders/:id/invoice/exports", readCookies, requireAuth, requireRole("staff"), protectMutation, recordStaffOrderInvoiceExport);
router.patch("/staff/orders/:id/status", readCookies, requireAuth, requireRole("staff"), protectMutation, updateStaffOrderStatus);
router.get("/staff/returns", readCookies, requireAuth, requireRole("staff"), listStaffReturns);
router.get("/staff/returns/:id", readCookies, requireAuth, requireRole("staff"), getStaffReturnDetail);
router.post("/staff/returns/:id/decision", readCookies, requireAuth, requireRole("staff"), protectMutation, decideStaffReturn);
router.get("/staff/products", readCookies, requireAuth, requireRole("staff"), getStaffProducts);
router.get("/staff/products/:sku", readCookies, requireAuth, requireRole("staff"), getProductBySku);
router.patch("/staff/products/:sku", readCookies, requireAuth, requireRole("staff"), protectMutation, updateStaffProduct);

router.get("/admin/dashboard", readCookies, requireAuth, requireRole("admin"), dashboard);
router.get("/admin/inventory", readCookies, requireAuth, requireRole("admin"), listInventory);
router.get("/admin/reports/finance/summary", readCookies, requireAuth, requireRole("admin"), getFinanceSummary);
router.get("/admin/reports/sales/summary", readCookies, requireAuth, requireRole("admin"), getSalesSummary);
router.get("/admin/reports/inventory", readCookies, requireAuth, requireRole("admin"), getInventoryReport);

export default router;
