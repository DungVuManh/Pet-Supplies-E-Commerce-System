import { z } from "zod";
import { listQueryShape } from "./list-query.js";

export const orderListQuerySchema = z.object({
 ...listQueryShape,
 tab: z.enum(["all", "processing", "shipping", "completed", "cancelled"]).default("all"),
 status: z.enum(["all", "pending", "processing", "shipping", "completed", "cancelled", "returned"]).default("all"),
});

/** An order code from the URL. Anything else is a missing order, not a validation error. */
export const orderCodeSchema = z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9-]+$/);
