import { z } from "zod";
import { MASTER_DATA_KINDS } from "../../models/master-data.model.js";
import { listQueryShape } from "./list-query.js";

export const masterDataListQuerySchema = z.object({
 ...listQueryShape,
 kind: z.enum(MASTER_DATA_KINDS).default("petType"),
 status: z.enum(["all", "active", "inactive"]).default("all"),
});
