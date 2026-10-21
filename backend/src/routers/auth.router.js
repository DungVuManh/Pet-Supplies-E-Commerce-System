import { Router } from "express";
import {
 readCookies,
 csrf,
 protectMutation,
 register,
 login,
 me,
 logout,
} from "../controllers/auth.controller.js";

const router = Router();
router.use(readCookies);
router.get("/csrf", csrf);
router.post("/register", protectMutation, register);
router.post("/session", protectMutation, login);
router.get("/me", me);
router.delete("/session", protectMutation, logout);

export default router;
