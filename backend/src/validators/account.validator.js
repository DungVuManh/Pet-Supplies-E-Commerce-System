import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

export const updateProfileSchema = z
  .object({
    fullName: z
      .string({ required_error: "Vui lòng nhập họ và tên." })
      .trim()
      .min(2, "Họ tên phải có ít nhất 2 ký tự.")
      .max(100, "Họ tên tối đa 100 ký tự."),
    phone: z
      .string({ required_error: "Vui lòng nhập số điện thoại." })
      .max(20)
      .transform((val) => val.replace(/[\s.-]/g, ""))
      .refine(
        (val) => /^(?:0|\+84)[0-9]{9}$/.test(val),
        "Số điện thoại Việt Nam không hợp lệ (9 hoặc 10 chữ số).",
      ),
    dob: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return undefined;
        const parsed = new Date(val);
        return isNaN(parsed.getTime()) ? undefined : parsed;
      }),
    gender: z.enum(["male", "female", "other"]).optional().default("female"),
    avatarUrl: z.string().optional(),
  })
  .strict();

export const addressSchema = z
  .object({
    recipientName: z
      .string({ required_error: "Vui lòng nhập tên người nhận." })
      .trim()
      .min(2, "Tên người nhận phải có ít nhất 2 ký tự.")
      .max(100, "Tên người nhận tối đa 100 ký tự."),
    phone: z
      .string({ required_error: "Vui lòng nhập số điện thoại người nhận." })
      .max(20)
      .transform((val) => val.replace(/[\s.-]/g, ""))
      .refine(
        (val) => /^(?:0|\+84)[0-9]{9}$/.test(val),
        "Số điện thoại không hợp lệ.",
      ),
    province: z
      .string({ required_error: "Vui lòng nhập Tỉnh/Thành phố." })
      .trim()
      .min(1, "Vui lòng nhập Tỉnh/Thành phố."),
    district: z
      .string({ required_error: "Vui lòng nhập Quận/Huyện." })
      .trim()
      .min(1, "Vui lòng nhập Quận/Huyện."),
    ward: z
      .string({ required_error: "Vui lòng nhập Phường/Xã." })
      .trim()
      .min(1, "Vui lòng nhập Phường/Xã."),
    street: z
      .string({ required_error: "Vui lòng nhập địa chỉ cụ thể." })
      .trim()
      .min(1, "Vui lòng nhập số nhà, tên đường."),
    addressType: z.enum(["home", "office"]).optional().default("home"),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

export const petSchema = z
  .object({
    name: z
      .string({ required_error: "Vui lòng nhập tên thú cưng." })
      .trim()
      .min(1, "Vui lòng nhập tên thú cưng.")
      .max(50, "Tên thú cưng tối đa 50 ký tự."),
    species: z
      .string({ required_error: "Vui lòng chọn loại thú cưng." })
      .trim()
      .min(1, "Vui lòng chọn loại thú cưng.")
      .refine(
        (val) => ["dog", "cat", "chó", "mèo", "other"].includes(val.toLowerCase()),
        "Loại thú cưng phải là chó, mèo hoặc loại khác.",
      )
      .transform((val) => {
        const lower = val.toLowerCase();
        if (lower === "chó" || lower === "dog") return "dog";
        if (lower === "mèo" || lower === "cat") return "cat";
        return val;
      }),
    breed: z.string().trim().max(100).optional().default(""),
    dob: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return undefined;
        const parsed = new Date(val);
        return isNaN(parsed.getTime()) ? undefined : parsed;
      }),
    age: z
      .union([z.string(), z.number()])
      .optional()
      .nullable()
      .transform((val) => (val !== undefined && val !== null && String(val).trim() ? String(val).trim() : undefined)),
    weight: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((val) => {
        if (val === undefined || val === null || val === "") return undefined;
        const n = Number(val);
        return isNaN(n) ? undefined : n;
      }),
    notes: z.string().trim().max(500).optional().default(""),
    avatarUrl: z.string().optional().nullable(),
  })
  .strict();

export function validateInput(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new AppError(
      firstIssue?.message || "Thông tin gửi lên chưa hợp lệ.",
      400,
      "VALIDATION_ERROR",
    );
  }
  return result.data;
}
