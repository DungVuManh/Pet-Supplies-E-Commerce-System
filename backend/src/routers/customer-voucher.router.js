import { Router } from "express";
import { readCookies, requireAuth } from "../common/middlewares/auth.middleware.js";
import {
  getSavedVoucherCodes,
  listCustomerVouchers,
  removeCustomerVoucher,
  saveCustomerVoucher,
  syncCustomerVouchers,
} from "../controllers/customer-voucher.controller.js";

const router = Router();

router.use(readCookies);
router.use(requireAuth);

router.get("/", listCustomerVouchers);
router.post("/", saveCustomerVoucher);
router.get("/ids", getSavedVoucherCodes);
router.post("/sync", syncCustomerVouchers);
router.delete("/:code", removeCustomerVoucher);

export default router;

