import { createHash } from "node:crypto";
import { z } from "zod";
import { parseBody } from "./auth.schema.js";

const phone = z.string().max(20).transform((s) => s.replace(/[\s.-]/g, ""))
 .refine((s) => /^(?:0|\+84)[0-9]{9}$/.test(s));
const customer = z.object({
 name: z.string().trim().min(2).max(100), phone,
 email: z.string().trim().toLowerCase().email().max(254).optional(),
}).strict();
const item = z.object({
 sku: z.string().trim().min(1).max(100),
 qty: z.number().int().min(1).max(999),
 expectedPrice: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
}).strict();
export const saleSchema = z.object({
 customerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
 customer: customer.optional(),
 items: z.array(item).min(1).max(50),
 cashReceived: z.literal(true),
}).strict().refine((v) => Boolean(v.customerId) !== Boolean(v.customer))
 .refine((v) => new Set(v.items.map((i) => i.sku)).size === v.items.length);

export const requestIdSchema = z.string().uuid();
export function parseSale(body) { return parseBody(saleSchema, body); }
export function parseRequestId(value) { return parseBody(requestIdSchema, value); }
export function saleHash(input) {
 const canonical = {
  customerId: input.customerId?.toLowerCase() || null,
  customer: input.customer ? {
   name: input.customer.name, phone: input.customer.phone, email: input.customer.email || null,
  } : null,
  items: [...input.items].sort((a, b) => a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0)
   .map(({ sku, qty, expectedPrice }) => ({ sku, qty, expectedPrice })),
 };
 return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
export function parseLookup(query, customerSearch = false) {
 return parseBody(z.object({
  query: z.string().trim().min(customerSearch ? 2 : 0).max(100).default(""),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number)
   .pipe(z.number().int().max(100)).default(1),
 }).strict(), query);
}
export function literalRegex(text) {
 return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}
