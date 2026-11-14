import { z } from "zod";
import { listQueryShape } from "./list-query.js";

const dateString = z.string().trim().refine((val) => {
  if (!val) return true;
  const d = new Date(val);
  return Number.isFinite(d.getTime());
}, { message: "Ngày không hợp lệ" });

export const auditLogListQuerySchema = z.object({
  ...listQueryShape,
  action: z.string().trim().default("all"),
  from: dateString.optional(),
  to: dateString.optional(),
  result: z.enum(["all", "success", "denied", "Thành công", "Bị từ chối"]).default("all"),
});

