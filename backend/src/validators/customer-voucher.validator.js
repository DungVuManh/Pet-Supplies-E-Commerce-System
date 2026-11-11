import { z } from "zod";

export const saveCustomerVoucherSchema = z.object({
  code: z.string().trim().min(1).max(60).transform((val) => val.toUpperCase()),
});

export const removeCustomerVoucherParamsSchema = z.object({
  code: z.string().trim().min(1).max(60).transform((val) => val.toUpperCase()),
});

export const syncCustomerVouchersSchema = z.object({
  codes: z
    .array(z.string().trim().min(1).max(60).transform((val) => val.toUpperCase()))
    .min(1)
    .max(100),
});

export const listCustomerVouchersQuerySchema = z.object({
  status: z.enum(["all", "ready", "used", "expired"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  subtotal: z.coerce.number().int().min(0).optional(),
});

