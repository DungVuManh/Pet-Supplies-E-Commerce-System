import { Router } from "express";
import { listInventory } from "../controllers/inventory.controller.js";

const router = Router();

// GET /api/v1/admin/inventory
router.get("/", listInventory);

export default router;
