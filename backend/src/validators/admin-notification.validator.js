import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";
import { ADMIN_NOTIFICATION_TYPES } from "../models/admin-notification.model.js";

const listAdminNotificationsSchema = z.object({
  tab: z.enum(["unread", "all", "saved"]).default("all"),
  type: z.enum(["all", "order", "stock", "system", "Đơn hàng", "Kho hàng", "Hệ thống"]).default("all"),
  status: z.enum(["all", "unread", "read", "Chưa đọc", "Đã đọc"]).default("all"),
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function parseListAdminNotificationsQuery(query) {
  const result = listAdminNotificationsSchema.safeParse(query);
  if (!result.success) {
    throw new AppError("Tham số truy vấn thông báo không hợp lệ.", 400, "VALIDATION_ERROR");
  }

  const data = result.data;

  // Ánh xạ nhãn tiếng Việt sang giá trị enum chuẩn
  let type = data.type;
  if (type === "Đơn hàng") type = "order";
  else if (type === "Kho hàng") type = "stock";
  else if (type === "Hệ thống") type = "system";

  let status = data.status;
  if (status === "Chưa đọc") status = "unread";
  else if (status === "Đã đọc") status = "read";

  return {
    tab: data.tab,
    type,
    status,
    q: data.q,
    page: data.page,
    limit: data.limit,
  };
}

const createAdminNotificationSchema = z.object({
  type: z.enum(ADMIN_NOTIFICATION_TYPES),
  title: z.string().trim().min(1, "Tiêu đề không được để trống").max(200, "Tiêu đề tối đa 200 ký tự"),
  detail: z.string().trim().max(1000, "Chi tiết tối đa 1000 ký tự").optional().default(""),
  targetHref: z
    .string()
    .trim()
    .refine((v) => !v || /^\/admin(\/|\?|$)/.test(v), {
      message: "targetHref phải là đường dẫn nội bộ admin (/admin/...)",
    })
    .optional(),
  reference: z.string().trim().max(100).optional(),
});

export function parseCreateAdminNotification(body) {
  const result = createAdminNotificationSchema.safeParse(body);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".");
      fields[key] = issue.message;
    }
    throw new AppError("Dữ liệu thông báo không hợp lệ.", 400, "VALIDATION_ERROR", fields);
  }
  return result.data;
}

const updateNotificationReadSchema = z.object({
  read: z.boolean().optional(),
});

export function parseUpdateNotificationRead(body) {
  const result = updateNotificationReadSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("Trạng thái đọc không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  return result.data;
}

const updateNotificationSaveSchema = z.object({
  saved: z.boolean().optional(),
});

export function parseUpdateNotificationSave(body) {
  const result = updateNotificationSaveSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("Trạng thái lưu không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  return result.data;
}

