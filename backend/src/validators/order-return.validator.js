import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

export const RETURN_REASONS = [
  "damaged_or_defective",
  "not_received",
  "missing_items",
  "damaged_or_missing",
];

export const RETURN_STATUSES = [
  "pending",
  "approved",
  "customer_shipped",
  "received",
  "completed",
  "rejected",
];

export const CLOUDINARY_IMAGE_URL_REGEX =
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/.+$/;

const cloudinaryImageUrlSchema = z
  .string()
  .trim()
  .regex(CLOUDINARY_IMAGE_URL_REGEX, "Liên kết hình ảnh không hợp lệ.");

export const returnBankAccountSchema = z
  .object({
    bankName: z
      .string()
      .trim()
      .min(2, "Tên ngân hàng tối thiểu 2 ký tự.")
      .max(100, "Tên ngân hàng tối đa 100 ký tự."),
    accountNumber: z
      .string()
      .trim()
      .min(6, "Số tài khoản ngân hàng tối thiểu 6 ký tự.")
      .max(30, "Số tài khoản ngân hàng tối đa 30 ký tự.")
      .regex(/^[0-9a-zA-Z]+$/, "Số tài khoản chỉ bao gồm chữ và số."),
    accountHolder: z
      .string()
      .trim()
      .min(2, "Tên chủ tài khoản tối thiểu 2 ký tự.")
      .max(100, "Tên chủ tài khoản tối đa 100 ký tự."),
  })
  .strict();

export const customerReturnRequestSchema = z
  .object({
    reason: z.enum(RETURN_REASONS),
    bankAccount: returnBankAccountSchema,
    description: z.string().trim().min(10).max(1000),
    images: z.array(cloudinaryImageUrlSchema).max(5).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.reason !== "not_received" && value.images.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: "Vui lòng tải lên ít nhất 1 hình ảnh minh chứng.",
      });
    }
  });

export const staffReturnQuerySchema = z
  .object({
    query: z.string().trim().max(100).default(""),
    status: z.enum(["all", ...RETURN_STATUSES]).default("all"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export const staffReturnDecisionSchema = z
  .object({
    action: z
      .enum(["approve_request", "reject_request", "complete_refund", "reject_refund"])
      .optional(),
    decision: z.enum(["approve", "reject"]).optional(),
    refundAmount: z.coerce.number().min(0).optional(),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const isReject =
      value.action === "reject_request" ||
      value.action === "reject_refund" ||
      value.decision === "reject";
    if (isReject) {
      const reason = value.rejectionReason?.trim() || "";
      if (reason.length < 5) {
        ctx.addIssue({
          code: "custom",
          path: ["rejectionReason"],
          message: "Vui lòng nhập lý do từ chối tối thiểu 5 ký tự.",
        });
      }
    }
  });

export function parseCustomerReturnRequest(body) {
  const result = customerReturnRequestSchema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    if (firstIssue?.path?.[0] === "images") {
      throw new AppError(
        firstIssue.message || "Hình ảnh minh chứng không hợp lệ.",
        400,
        "VALIDATION_ERROR"
      );
    }
    throw new AppError(
      "Thông tin yêu cầu hoàn trả chưa hợp lệ. Vui lòng kiểm tra lý do, mô tả (10–1000 ký tự) và hình ảnh.",
      400,
      "VALIDATION_ERROR"
    );
  }
  return result.data;
}

export function parseStaffReturnQuery(query) {
  const result = staffReturnQuerySchema.safeParse(query);
  if (!result.success) {
    throw new AppError("Tham số lọc yêu cầu hoàn trả không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  return result.data;
}

export function parseStaffReturnDecision(body) {
  const result = staffReturnDecisionSchema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new AppError(
      firstIssue?.path?.[0] === "rejectionReason"
        ? "Vui lòng nhập lý do từ chối từ 5 đến 500 ký tự."
        : "Thông tin xử lý yêu cầu hoàn trả không hợp lệ.",
      400,
      "VALIDATION_ERROR"
    );
  }
  const action =
    result.data.action ||
    (result.data.decision === "approve" ? "approve_request" : "reject_request");
  return {
    action,
    decision:
      result.data.decision ||
      (action.startsWith("approve") || action.startsWith("complete")
        ? "approve"
        : "reject"),
    refundAmount: result.data.refundAmount,
    rejectionReason: result.data.rejectionReason?.trim() || "",
  };
}

