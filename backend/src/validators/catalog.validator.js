import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

// ============================================================
// Validator cho trang "All Products" (màn hình catalog công khai)
// Kiểm tra các query params mà frontend gửi lên
// ============================================================

// Danh sách giá trị hợp lệ cho sort (sắp xếp)
const sortValues = ["default", "price-asc", "price-desc", "name-asc", "name-desc"];

// Danh sách khoảng giá hợp lệ
const priceRangeValues = ["under-100k", "100k-300k", "above-300k"];

// Schema kiểm tra query params
const catalogQuerySchema = z.object({
  // Từ khóa tìm kiếm: chuỗi tùy ý, tối đa 200 ký tự
  search: z.string().max(200).optional().default(""),

  // Lọc theo danh mục (slug hoặc "all")
  category: z.string().max(100).optional().default("all"),

  // Lọc theo loại thú cưng
  petType: z.string().max(50).optional().default("all"),

  // Lọc theo thương hiệu (có thể chọn nhiều, cách nhau bằng dấu phẩy)
  // Ví dụ: brands=KONG,Royal Canin
  brands: z.string().max(500).optional().default(""),

  // Lọc theo khoảng giá (có thể chọn nhiều)
  // Ví dụ: priceRanges=under-100k,100k-300k
  priceRanges: z.string().optional().default(""),

  // Sắp xếp
  sort: z.enum(sortValues).optional().default("default"),

  // Phân trang
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1, { message: "Page phải >= 1" }),

  limit: z
    .string()
    .optional()
    .default("12")
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 100, { message: "Limit phải từ 1 đến 100" }),
});

/**
 * Hàm kiểm tra và lấy query params cho trang catalog
 * @param {object} query - req.query từ Express
 * @returns {object} - Dữ liệu đã được kiểm tra và ép kiểu
 */
export function parseCatalogQuery(query) {
  const result = catalogQuerySchema.safeParse(query);

  if (!result.success) {
    // Lấy lỗi đầu tiên để trả về thông báo dễ hiểu
    const firstError = result.error.errors[0];
    throw new AppError(
      `Query không hợp lệ: ${firstError.message}`,
      400,
      "VALIDATION_ERROR"
    );
  }

  return result.data;
}
