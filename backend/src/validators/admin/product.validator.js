import { z } from "zod";
import { listQueryShape } from "./list-query.js";

export const productListQuerySchema = z.object({
 ...listQueryShape,
 tab: z.enum(["all", "active", "hidden"]).default("all"),
 category: z.string().trim().max(100).default("all"),
 status: z.enum(["all", "active", "low", "hidden"]).default("all"),
});

const integer = (message) => z.number({ error: message }).int(message).min(0, message).max(Number.MAX_SAFE_INTEGER, message);

// Only changed fields are sent. A SKU is checked only when it changes, because the
// seed data has older SKUs that do not meet this rule.
export const productPatchSchema = z.object({
 name: z.string({ error: "Tên sản phẩm không hợp lệ." }).trim().min(3, "Tên sản phẩm phải có ít nhất 3 ký tự.").max(200, "Tên sản phẩm tối đa 200 ký tự.").optional(),
 sku: z.string({ error: "SKU không hợp lệ." }).trim().max(100, "SKU tối đa 100 ký tự.")
  .regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/, "SKU gồm chữ in hoa, số và dấu gạch ngang, ví dụ RC-MA-2KG.").optional(),
 brand: z.string({ error: "Thương hiệu không hợp lệ." }).trim().max(100, "Thương hiệu tối đa 100 ký tự.").optional(),
 // The values the Customer catalog filters on.
 petType: z.enum(["dog", "cat", "all"], { error: "Loài thú cưng không hợp lệ." }).optional(),
 categoryCodes: z.array(z.string().trim().min(1).max(100), { error: "Danh mục không hợp lệ." }).min(1, "Chọn ít nhất một danh mục.").max(30, "Chọn tối đa 30 danh mục.").optional(),
 description: z.string({ error: "Mô tả không hợp lệ." }).trim().max(20000, "Mô tả tối đa 20.000 ký tự.").optional(),
 unit: z.string({ error: "Đơn vị không hợp lệ." }).trim().max(50, "Đơn vị tối đa 50 ký tự.").optional(),
 isActive: z.boolean({ error: "Trạng thái không hợp lệ." }).optional(),
 price: integer("Giá bán phải là số nguyên lớn hơn 0.").min(1, "Giá bán phải là số nguyên lớn hơn 0.").optional(),
 cost: integer("Giá vốn phải là số nguyên không âm.").nullable().optional(),
 stock: integer("Tồn kho phải là số nguyên không âm.").optional(),
 expectedStock: integer("Thiếu tồn kho lúc tải biểu mẫu.").optional(),
 lowStockThreshold: integer("Ngưỡng cảnh báo phải là số nguyên không âm.").nullable().optional(),
}).strict();
