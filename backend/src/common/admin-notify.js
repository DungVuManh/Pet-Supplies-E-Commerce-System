import { AdminNotification } from "../models/admin-notification.model.js";

/**
 * Creates one notification shared by every Admin. A notification never rolls
 * back the action that triggered it (CR-13): failures are logged and null is returned.
 */
export async function notifyAdmins({ type, title, detail, targetHref, reference }) {
 try {
  return await AdminNotification.create({ type, title, detail, targetHref, reference });
 } catch {
  console.error("[admin-notify] Failed to create notification", { type, reference });
  return null;
 }
}
