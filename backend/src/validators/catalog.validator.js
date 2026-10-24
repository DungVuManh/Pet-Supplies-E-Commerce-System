import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";


const sortValues = ["default", "price-asc", "price-desc", "name-asc", "name-desc"];

const priceRangeValues = ["under-100k", "100k-300k", "above-300k"];

const catalogQuerySchema = z.object({
  search: z.string().max(200).optional().default(""),

  category: z.string().max(100).optional().default("all"),

  petType: z.string().max(50).optional().default("all"),

  brands: z.string().max(500).optional().default(""),

  priceRanges: z.string().optional().default(""),

  sort: z.enum(sortValues).optional().default("default"),
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

export function parseCatalogQuery(query) {
  const result = catalogQuerySchema.safeParse(query);

  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new AppError(
      `Query không hợp lệ: ${firstError.message}`,
      400,
      "VALIDATION_ERROR"
    );
  }

  return result.data;
}
