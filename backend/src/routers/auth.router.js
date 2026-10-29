import { Router } from "express";
import {
  csrf,
  protectMutation,
  register,
  login,
  me,
  logout,
} from "../controllers/auth.controller.js";
import {
  readCookies,
  requireAuth,
} from "../common/middlewares/auth.middleware.js";

const router = Router();
router.use(readCookies);
router.get("/csrf", csrf);
router.post("/register", protectMutation, register);
router.post("/session", protectMutation, login);
router.get("/me", requireAuth, me);
router.delete("/session", protectMutation, logout);

export default router;
