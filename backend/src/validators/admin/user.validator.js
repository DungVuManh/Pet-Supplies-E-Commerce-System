import { z } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import { listQueryShape } from "./list-query.js";

// Admin accounts are not listed, so `admin` is not a valid filter value.
const roleFilter = z.enum(["all", "customer", "staff"]).default("all");

export const userListQuerySchema = z.object({
 ...listQueryShape,
 tab: roleFilter,
 role: roleFilter,
 status: z.enum(["all", "active", "locked"]).default("all"),
});

const lockSchema = z.object({ reason: z.string().trim().min(3).max(200) }).strict();

/** The lock request body; an invalid reason is a 400 VALIDATION_ERROR. */
export function parseLockBody(body) {
 const result = lockSchema.safeParse(body);
 if (!result.success) {
  throw new AppError("Lý do khóa phải có từ 3 đến 200 ký tự.", 400, "VALIDATION_ERROR");
 }
 return result.data;
}

// Same phone rule as the account profile. Email is owned by Firebase, so it is an unknown key here.
export const userPatchSchema = z.object({
 expectedUpdatedAt: z.string({ error: "Thiếu thời điểm tải dữ liệu." }).refine((value) => Number.isFinite(Date.parse(value)), "Thời điểm tải dữ liệu không hợp lệ."),
 fullName: z.string({ error: "Họ tên không hợp lệ." }).trim().min(2, "Họ tên phải có ít nhất 2 ký tự.").max(100, "Họ tên tối đa 100 ký tự.").optional(),
 phone: z.string({ error: "Số điện thoại không hợp lệ." }).max(20, "Số điện thoại không hợp lệ.")
  .transform((value) => value.replace(/[\s.-]/g, ""))
  .refine((value) => /^(?:0|\+84)[0-9]{9}$/.test(value), "Số điện thoại Việt Nam không hợp lệ.")
  .optional(),
 role: z.enum(["customer", "staff"], { error: "Vai trò chỉ có thể là Customer hoặc Staff." }).optional(),
 status: z.enum(["active", "locked"], { error: "Trạng thái không hợp lệ." }).optional(),
 lockReason: z.string({ error: "Lý do khóa không hợp lệ." }).trim().min(3, "Lý do khóa phải có từ 3 đến 200 ký tự.").max(200, "Lý do khóa phải có từ 3 đến 200 ký tự.").optional(),
 adminNote: z.string({ error: "Ghi chú không hợp lệ." }).trim().max(1000, "Ghi chú tối đa 1000 ký tự.").optional(),
}).strict();
