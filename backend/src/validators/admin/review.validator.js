import { z } from "zod";
import { listQueryShape } from "./list-query.js";

export const reviewListQuerySchema = z.object({
 ...listQueryShape,
 pageSize: z.coerce.number().int().min(1).max(100).default(10),
 rating: z.enum(["all", "1", "2", "3", "4", "5"]).default("all"),
});
