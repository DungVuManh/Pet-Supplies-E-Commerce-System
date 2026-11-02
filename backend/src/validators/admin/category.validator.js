import { z } from "zod";
import { listQueryShape } from "./list-query.js";

export const categoryListQuerySchema = z.object({
 ...listQueryShape,
 status: z.enum(["all", "active", "hidden"]).default("all"),
});
