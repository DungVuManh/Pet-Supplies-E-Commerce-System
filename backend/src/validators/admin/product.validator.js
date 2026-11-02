import { z } from "zod";
import { listQueryShape } from "./list-query.js";

export const productListQuerySchema = z.object({
 ...listQueryShape,
 tab: z.enum(["all", "active", "hidden"]).default("all"),
 category: z.string().trim().max(100).default("all"),
 status: z.enum(["all", "active", "low", "hidden"]).default("all"),
});
