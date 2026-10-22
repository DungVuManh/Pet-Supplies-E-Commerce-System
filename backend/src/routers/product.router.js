import { Router } from "express";
import { getPublicProducts, getProductBySku } from "../controllers/product.controller.js";

const router = Router();

router.get("/", getPublicProducts);
router.get("/:sku", getProductBySku);

export default router;
