import { z } from 'zod';
import { AppError } from '../common/errors/app-error.js';

export const sessionSchema = z.object({
  idToken: z.string().min(1).max(16000),
  remember: z.boolean().default(false),
}).strict();

export const registerSchema = sessionSchema.extend({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().max(20).transform((value) => value.replace(/[\s.-]/g, ''))
    .refine((value) => /^(?:0|\+84)[0-9]{9}$/.test(value)),
  terms: z.literal(true),
}).strict();

export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError('Thông tin gửi lên chưa hợp lệ.', 400, 'VALIDATION_ERROR');
  return result.data;
}
