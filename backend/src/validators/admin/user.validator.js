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
