import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

export const sepayWebhookSchema = z.object({
  id: z.coerce.number().int().positive({ message: "Mã giao dịch SePay không hợp lệ" }),
  gateway: z.string().trim().min(1, { message: "Tên ngân hàng gateway không được để trống" }),
  transactionDate: z.string().trim().min(1, { message: "Ngày giao dịch không được để trống" }),
  accountNumber: z.string().trim().min(1, { message: "Số tài khoản nhận không được để trống" }),
  subAccount: z.string().trim().nullable().optional(),
  code: z.string().trim().nullable().optional(),
  content: z.string().trim().min(1, { message: "Nội dung chuyển khoản không được để trống" }),
  transferType: z.enum(["in", "out"], { message: "Loại giao dịch phải là 'in' hoặc 'out'" }),
  transferAmount: z.coerce.number().int().min(0, { message: "Số tiền chuyển phải là số nguyên không âm" }),
  accumulated: z.coerce.number().int().optional(),
  referenceCode: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
});

export function parseSepayWebhook(body) {
  const result = sepayWebhookSchema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new AppError(firstIssue?.message || "Dữ liệu webhook không hợp lệ.", 400, "INVALID_WEBHOOK_PAYLOAD");
  }
  return result.data;
}

export const orderCodeParamSchema = z.object({
  orderCode: z.string().trim().min(1, { message: "Mã đơn hàng không được để trống" }),
});

export function parseOrderCode(orderCode) {
  const result = orderCodeParamSchema.safeParse({ orderCode });
  if (!result.success) {
    throw new AppError("Mã đơn hàng không hợp lệ.", 400, "INVALID_ORDER_CODE");
  }
  return result.data.orderCode;
}
