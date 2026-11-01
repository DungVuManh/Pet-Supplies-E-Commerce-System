import { z } from "zod";
import { listQueryShape } from "./list-query.js";

// Admin accounts are not listed, so `admin` is not a valid filter value.
const roleFilter = z.enum(["all", "customer", "staff"]).default("all");

export const userListQuerySchema = z.object({
 ...listQueryShape,
 tab: roleFilter,
 role: roleFilter,
 status: z.enum(["all", "active", "locked"]).default("all"),
});
