import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
const originSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return (
          ['http:', 'https:'].includes(url.protocol) && url.origin === value
        );
      } catch {
        return false;
      }
    },
    { message: 'Expected an HTTP(S) origin without a path or trailing slash' },
  );
const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  MONGODB_URI: z
    .string()
    .trim()
    .refine(
      (uri) => {
        try {
          // The driver's constructor validates URI syntax without connecting.
          new mongoose.mongo.MongoClient(uri);
          return true;
        } catch {
          return false;
        }
      },
      {
        message:
          'Expected a valid mongodb:// or mongodb+srv:// connection string',
      },
    ),
  CORS_ORIGIN: z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(originSchema).min(1)),
});
export function parseEnvironment(values) {
  const defaults =
    values.NODE_ENV === 'production'
      ? {}
      : {
          MONGODB_URI: 'mongodb://127.0.0.1:27017/pet_supplies',
          CORS_ORIGIN: 'http://localhost:3000',
        };
  const result = environmentSchema.safeParse({ ...defaults, ...values });
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path[0])),
    ];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }
  return result.data;
}
export function loadEnvironment() {
  dotenv.config({ quiet: true });
  return parseEnvironment(process.env);
}
