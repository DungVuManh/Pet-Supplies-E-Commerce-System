import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

const quantity = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const status = z.enum(["active", "hidden"]);
const updateSchema = z.object({
  physical: quantity,
  status,
  description: z.string().trim().min(1).max(10000),
  expected: z.object({
    physical: quantity,
    reserved: quantity,
    status,
    description: z.string().max(10000),
  }).strict(),
}).strict();
const skuSchema = z.object({ sku: z.string().min(1).max(100) }).strict();

export function parseProductSku(params) {
  const result = skuSchema.safeParse(params);
  if (!result.success) throw new AppError("Mã SKU không hợp lệ.", 400, "VALIDATION_ERROR");
  return result.data.sku;
}
export function parseProductUpdate(body) {
  const result = updateSchema.safeParse(body);
  if (!result.success) throw new AppError("Thông tin sản phẩm không hợp lệ.", 400, "VALIDATION_ERROR");
  return result.data;
}
