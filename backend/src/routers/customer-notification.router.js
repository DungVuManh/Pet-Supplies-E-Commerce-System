import { Router } from "express";
import { requireAuth } from "../common/middlewares/auth.middleware.js";
import {
  getCustomerNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/customer-notification.controller.js";

const router = Router();

// Toàn bộ API thông báo khách hàng yêu cầu đăng nhập
router.use(requireAuth);

router.get("/", getCustomerNotifications);
router.patch("/:id/read", markNotificationAsRead);
router.post("/read-all", markAllNotificationsAsRead);

export default router;

