import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

const updateStoreSettingsSchema = z.object({
  storeName: z.string().trim().min(1, "Vui lòng nhập tên cửa hàng.").max(200, "Tên cửa hàng tối đa 200 ký tự."),
  contactEmail: z
    .string()
    .trim()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Nhập email hợp lệ.",
    })
    .default(""),
  hotline: z.string().trim().max(50, "Hotline tối đa 50 ký tự.").default(""),
  address: z.string().trim().max(500, "Địa chỉ tối đa 500 ký tự.").default(""),
  timezone: z.string().trim().max(100).default("GMT+7 · Việt Nam"),
  currency: z.string().trim().max(50).default("VND – Việt Nam đồng"),
  standardShipping: z.boolean().default(true),
  expressShipping: z.boolean().default(false),
  freeShippingThreshold: z.coerce.number().int().min(0, "Ngưỡng miễn phí vận chuyển không được âm.").default(0),
  codPayment: z.boolean().optional().default(true),
  bankTransfer: z.boolean().optional().default(false),
  vnpay: z.boolean().optional().default(false),
  accountHolder: z.string().trim().max(200).optional().default(""),
  emailOrderConfirmation: z.boolean().default(true),
  lowStockAlert: z.boolean().default(true),
  dailyRevenueReport: z.boolean().default(false),
  promoNotification: z.boolean().default(false),
});

export function parseUpdateStoreSettings(body) {
  const result = updateStoreSettingsSchema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new AppError(firstIssue?.message || "Dữ liệu cấu hình không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  return result.data;
}
