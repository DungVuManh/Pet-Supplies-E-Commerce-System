import { z } from "zod";
import { listQueryShape } from "./list-query.js";

export const categoryListQuerySchema = z.object({
 ...listQueryShape,
 status: z.enum(["all", "active", "hidden"]).default("all"),
});

export const categoryPatchSchema = z.object({
 expectedUpdatedAt: z.string({ error: "Thiếu thời điểm tải dữ liệu." }).refine((value) => Number.isFinite(Date.parse(value)), "Thời điểm tải dữ liệu không hợp lệ."),
 name: z.string({ error: "Tên danh mục không hợp lệ." }).trim().min(2, "Tên danh mục phải có ít nhất 2 ký tự.").max(100, "Tên danh mục tối đa 100 ký tự.").optional(),
 slug: z.string({ error: "Đường dẫn không hợp lệ." }).trim().max(120, "Đường dẫn tối đa 120 ký tự.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Đường dẫn gồm chữ thường không dấu, số và dấu gạch ngang.").optional(),
 description: z.string({ error: "Mô tả không hợp lệ." }).trim().max(500, "Mô tả tối đa 500 ký tự.").optional(),
 displayOrder: z.number({ error: "Thứ tự hiển thị là số nguyên từ 1." }).int("Thứ tự hiển thị là số nguyên từ 1.").min(1, "Thứ tự hiển thị là số nguyên từ 1.").max(100000, "Thứ tự hiển thị quá lớn.").optional(),
 isActive: z.boolean({ error: "Trạng thái không hợp lệ." }).optional(),
}).strict();
