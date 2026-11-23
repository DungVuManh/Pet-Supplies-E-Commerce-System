import { Notification } from "../models/notification.model.js";

/**
 * Tạo thông báo gửi tới khách hàng (non-blocking).
 * Lỗi phát sinh trong quá trình lưu thông báo không bao giờ throw error
 * để đảm bảo an toàn cho transaction hoặc logic nghiệp vụ chính.
 */
export async function notifyCustomer({
  userId,
  orderId,
  type,
  title,
  message,
  link,
}) {
  try {
    if (!userId && !orderId) return null;
    return await Notification.create({
      userId,
      orderId,
      type: type || "system",
      channel: "in_app",
      status: "sent",
      title: title || "",
      message: message || "",
      link: link || "",
      read: false,
      sentAt: new Date(),
    });
  } catch (err) {
    console.error("[Notification] Failed to create customer notification:", err.message);
    return null;
  }
}

