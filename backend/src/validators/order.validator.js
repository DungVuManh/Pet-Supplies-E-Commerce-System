import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";
import { orderStatuses } from "../models/shared.schema.js";

const VIETNAMESE_ACCENT_MAP = {
  a: "[aàáảãạăằắẳẵặâầấẩẫậ]",
  e: "[eèéẻẽẹêềếểễệ]",
  i: "[iìíỉĩị]",
  o: "[oòóỏõọôồốổỗộơờớởỡợ]",
  u: "[uùúủũụưừứửữự]",
  y: "[yỳýỷỹỵ]",
  d: "[dđ]",
};

function isValidCalendarDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildSearchRegex(token) {
  const chars = [];
  for (const char of token.toLowerCase()) {
    if (VIETNAMESE_ACCENT_MAP[char]) {
      chars.push(VIETNAMESE_ACCENT_MAP[char]);
    } else {
      chars.push(escapeRegex(char));
    }
  }
  return new RegExp(chars.join(""), "i");
}

export function buildPhoneRegex(token) {
  const digits = token.replace(/\D/g, "");
  if (!digits) return null;
  const pattern = digits.split("").map(escapeRegex).join("[\\s.-]*");
  return new RegExp(pattern);
}

export function buildOrderSearchFilter(query) {
  if (!query || !query.trim()) return {};
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};

  const tokenConditions = tokens.map((token) => {
    const textRegex = buildSearchRegex(token);
    const phoneRegex = buildPhoneRegex(token);

    const orClauses = [
      { orderCode: new RegExp(escapeRegex(token), "i") },
      { "guestInfo.name": textRegex },
      { "shippingAddress.recipientName": textRegex },
    ];

    if (phoneRegex) {
      orClauses.push({ "guestInfo.phone": phoneRegex });
      orClauses.push({ "shippingAddress.phone": phoneRegex });
    }

    return { $or: orClauses };
  });

  return tokenConditions.length === 1 ? tokenConditions[0] : { $and: tokenConditions };
}

export function computeDateRange(dateFrom, dateTo) {
  const range = {};
  if (dateFrom) {
    range.$gte = new Date(`${dateFrom}T00:00:00.000+07:00`);
  }
  if (dateTo) {
    const [y, m, d] = dateTo.split("-").map(Number);
    const nextDate = new Date(Date.UTC(y, m - 1, d + 1));
    const nextY = nextDate.getUTCFullYear();
    const nextM = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
    const nextD = String(nextDate.getUTCDate()).padStart(2, "0");
    range.$lt = new Date(`${nextY}-${nextM}-${nextD}T00:00:00.000+07:00`);
  }
  return range;
}

const integerParamSchema = (min, max, defaultValue) =>
  z.preprocess(
    (val) => (val === undefined ? defaultValue : val),
    z.union([
      z.number().int().min(min).max(max),
      z
        .string()
        .regex(/^[1-9]\d*$/, "Phải là số nguyên dương dạng thập phân")
        .transform((v) => parseInt(v, 10))
        .pipe(z.number().int().min(min).max(max)),
    ])
  );

export const staffOrderQuerySchema = z
  .object({
    query: z.string().trim().max(100).default(""),
    status: z.enum(["all", ...orderStatuses]).default("all"),
    dateFrom: z
      .string()
      .refine(isValidCalendarDate, "dateFrom phải có định dạng YYYY-MM-DD hợp lệ")
      .optional(),
    dateTo: z
      .string()
      .refine(isValidCalendarDate, "dateTo phải có định dạng YYYY-MM-DD hợp lệ")
      .optional(),
    sort: z
      .enum(["createdAt_desc", "createdAt_asc", "total_desc", "total_asc"])
      .default("createdAt_desc"),
    page: integerParamSchema(1, 10000, 1),
    pageSize: integerParamSchema(1, 50, 8),
  })
  .strict()
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return data.dateFrom <= data.dateTo;
      }
      return true;
    },
    {
      message: "dateFrom không được lớn hơn dateTo",
      path: ["dateFrom"],
    }
  );

export const orderIdParamSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Mã đơn hàng không hợp lệ"),
  })
  .strict();

export function parseOrderQuery(query) {
  const result = staffOrderQuerySchema.safeParse(query);
  if (!result.success) {
    throw new AppError("Tham số bộ lọc không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  return result.data;
}

export function parseOrderId(params) {
  const result = orderIdParamSchema.safeParse(params);
  if (!result.success) {
    throw new AppError("Mã đơn hàng không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  return result.data.id;
}

export const staffOrderTransitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipping"],
  shipping: [],
  delivered: [],
  completed: [],
  cancelled: [],
};

const staffOrderStatusSchema = z.object({
  expectedStatus: z.enum(orderStatuses),
  orderStatus: z.enum(["confirmed", "processing", "shipping", "cancelled"]),
  shipping: z.object({
    carrier: z.string().trim().max(100).default(""),
    trackingNumber: z.string().trim().max(100).default(""),
  }).strict().optional(),
}).strict().refine((value) => !value.shipping || value.orderStatus === "shipping");

export function parseStaffOrderStatus(body) {
  const result = staffOrderStatusSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("Thông tin cập nhật trạng thái không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  return result.data;
}
