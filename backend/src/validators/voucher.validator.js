import { z } from "zod";

const quoteItemSchema = z.object({
 productId: z.string().min(1).max(64),
 variantSku: z.string().max(100).optional(),
 qty: z.number().int().positive().max(100000).optional(),
 quantity: z.number().int().positive().max(100000).optional(),
});

export const voucherQuoteSchema = z.object({
 code: z.string().trim().min(1).max(60),
 items: z.array(quoteItemSchema).min(1).max(100),
 phone: z.string().max(30).optional(),
});

export const publicVouchersQuerySchema = z.object({
 limit: z.coerce.number().int().min(1).max(50).default(6),
});
