import { z } from "zod";
import { listQueryShape } from "./list-query.js";

export const orderListQuerySchema = z.object({
 ...listQueryShape,
 tab: z.enum(["all", "processing", "shipping", "completed", "cancelled"]).default("all"),
 status: z.enum(["all", "pending", "processing", "shipping", "completed", "cancelled"]).default("all"),
});
