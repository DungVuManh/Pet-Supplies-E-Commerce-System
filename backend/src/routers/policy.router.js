import { Router } from "express";
import { getPublicPolicy, listPublicPolicies } from "../controllers/policy.controller.js";

const router = Router();

router.get("/", listPublicPolicies);
router.get("/:slug", getPublicPolicy);

export default router;
