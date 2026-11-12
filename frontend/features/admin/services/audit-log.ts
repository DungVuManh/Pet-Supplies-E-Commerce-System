import { apiGet } from "@/lib/api-client";
import type { AdminAuditLogRow, AuditLogFilter, Page } from "../types";

export function listAuditLogs(
  query: AuditLogFilter & { page: number; pageSize: number },
  signal: AbortSignal,
) {
  return apiGet<Page<AdminAuditLogRow>>("/api/v1/admin/audit-logs", query, { signal });
}

