// =============================================================
// backend/src/validators/wishlist.validator.js
// Validator kiểm tra dữ liệu đầu vào cho Wishlist (Danh sách yêu thích)
// =============================================================

import mongoose from "mongoose";
import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

const wishlistItemSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, "ID sản phẩm không được để trống")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "ID sản phẩm không hợp lệ (phải là MongoDB ObjectId)",
    }),
});

export function parseWishlistInput(body) {
  const result = wishlistItemSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new AppError(
      `Dữ liệu không hợp lệ: ${firstError.message}`,
      400,
      "VALIDATION_ERROR"
    );
  }
  return result.data;
}

