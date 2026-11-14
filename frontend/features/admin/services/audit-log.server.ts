import "server-only";
import { serverGet } from "@/lib/server-api";
import type { AdminAuditLogRow } from "../types";

/** Fetches a single audit log entry by ID for the detail view in server components */
export function getAuditLog(id: string) {
  return serverGet<AdminAuditLogRow>(`/api/v1/admin/audit-logs/${encodeURIComponent(id)}`);
}
