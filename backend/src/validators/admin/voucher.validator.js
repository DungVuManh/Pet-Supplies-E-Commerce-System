import { z } from "zod";
import { listQueryShape } from "./list-query.js";

export const VOUCHER_TABS = ["all", "active", "scheduled", "ended", "disabled"];

export const voucherListQuerySchema = z.object({
 ...listQueryShape,
 tab: z.enum(VOUCHER_TABS).default("all"),
});

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const date = (label) => z.string({ error: `Vui lòng chọn ${label}.` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${capitalize(label)} không hợp lệ.`)
 .refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(value);
 }, `${capitalize(label)} không hợp lệ.`);

const wholeVnd = (message) => z.number({ error: message }).int(message).max(Number.MAX_SAFE_INTEGER, message);

/** Every field the form edits. Cross-field rules run on the merged result, so an edit is held to them too. */
export const voucherFieldsSchema = z.object({
 code: z.string({ error: "Vui lòng nhập mã voucher." }).trim().toUpperCase()
  .regex(/^[A-Z0-9-]{3,30}$/, "Mã voucher gồm 3–30 ký tự: chữ không dấu, số hoặc dấu gạch ngang."),
 name: z.string({ error: "Vui lòng nhập tên voucher." }).trim().min(1, "Vui lòng nhập tên voucher.").max(100, "Tên voucher tối đa 100 ký tự."),
 type: z.enum(["percent", "fixed"], { error: "Loại giảm giá không hợp lệ." }),
 value: wholeVnd("Giá trị giảm phải là số nguyên.").min(1, "Giá trị giảm phải từ 1 trở lên."),
 maxDiscount: wholeVnd("Mức giảm tối đa phải là số nguyên.").min(1, "Mức giảm tối đa phải từ 1 ₫ trở lên.").nullable().default(null),
 minOrderAmount: wholeVnd("Đơn tối thiểu phải là số nguyên.").min(0, "Đơn tối thiểu không được âm.").default(0),
 startDate: date("ngày bắt đầu"),
 endDate: date("ngày kết thúc"),
 usageLimit: wholeVnd("Giới hạn lượt dùng phải là số nguyên.").min(1, "Giới hạn lượt dùng phải từ 1 trở lên.").nullable().default(null),
 oncePerCustomer: z.boolean({ error: "Giới hạn mỗi khách không hợp lệ." }).default(true),
 isPublic: z.boolean({ error: "Tùy chọn hiển thị không hợp lệ." }).default(false),
}).strict().superRefine((fields, context) => {
 if (fields.type === "percent" && fields.value > 100) {
  context.addIssue({ code: "custom", path: ["value"], message: "Phần trăm giảm phải từ 1 đến 100." });
 }
 if (fields.type === "fixed" && fields.maxDiscount !== null) {
  context.addIssue({ code: "custom", path: ["maxDiscount"], message: "Chỉ voucher theo phần trăm mới có mức giảm tối đa." });
 }
 if (fields.endDate < fields.startDate) {
  context.addIssue({ code: "custom", path: ["endDate"], message: "Ngày kết thúc phải từ ngày bắt đầu trở đi." });
 }
});

/** An edit: `expectedUpdatedAt` plus any form fields, checked against the voucher in the controller. */
export const voucherPatchSchema = z.object({
 expectedUpdatedAt: z.string({ error: "Thiếu thời điểm tải dữ liệu." }).refine((value) => Number.isFinite(Date.parse(value)), "Thời điểm tải dữ liệu không hợp lệ."),
}).catchall(z.unknown());
