import { Router } from "express";
import {
 readCookies,
 requireAuth,
} from "../common/middlewares/auth.middleware.js";
import {
 getCustomerNotifications,
 markAllNotificationsAsRead,
 markNotificationAsRead,
} from "../controllers/customer-notification.controller.js";

const router = Router();

// Toàn bộ API thông báo khách hàng yêu cầu đọc cookie và xác thực đăng nhập
router.use(readCookies);
router.use(requireAuth);

router.get("/", getCustomerNotifications);
router.patch("/:id/read", markNotificationAsRead);
router.post("/read-all", markAllNotificationsAsRead);

export default router;
