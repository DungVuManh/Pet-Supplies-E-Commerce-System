// =============================================================
// backend/src/validators/cart.validator.js
// Validator cho các request liên quan đến Giỏ hàng (Cart)
// =============================================================

import mongoose from "mongoose";
import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

const addToCartSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, "productId không được để trống")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "productId không phải là ObjectId hợp lệ",
    }),
  variantSku: z
    .string()
    .trim()
    .min(1, "variantSku không được để trống"),
  quantity: z
    .number()
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng phải lớn hơn hoặc bằng 1")
    .optional()
    .default(1),
  guestToken: z.string().trim().optional(),
});

const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng phải lớn hơn hoặc bằng 1"),
  guestToken: z.string().trim().optional(),
});

export function parseAddToCartInput(body) {
  const result = addToCartSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new AppError(
      `Dữ liệu thêm vào giỏ không hợp lệ: ${firstError.message}`,
      400,
      "VALIDATION_ERROR"
    );
  }
  return result.data;
}

export function parseUpdateCartItemInput(body) {
  const result = updateCartItemSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new AppError(
      `Dữ liệu cập nhật giỏ không hợp lệ: ${firstError.message}`,
      400,
      "VALIDATION_ERROR"
    );
  }
  return result.data;
}
