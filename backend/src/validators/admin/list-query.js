import { z } from "zod";
import { AppError } from "../../common/errors/app-error.js";

/** Paging and search fields shared by every Admin list; spread into a domain schema. */
export const listQueryShape = {
 page: z.coerce.number().int().min(1).default(1),
 pageSize: z.coerce.number().int().min(1).max(100).default(6),
 q: z.string().trim().max(100).default(""),
};

export const listQuerySchema = z.object(listQueryShape);

/** Parses `request.query` with `schema`; invalid input is a 400 VALIDATION_ERROR. */
export function parseQuery(schema, query) {
 const result = schema.safeParse(query ?? {});
 if (!result.success) {
  throw new AppError("Bộ lọc hoặc phân trang không hợp lệ.", 400, "VALIDATION_ERROR");
 }
 return result.data;
}
