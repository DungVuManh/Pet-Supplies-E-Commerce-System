"use client";

import { listAuditLogs } from "../services/audit-log";
import type { AuditLogFilter } from "../types";
import { useAdminList } from "./use-admin-list";

const initial: AuditLogFilter = { q: "", action: "all", result: "all" };

/** Filters, paging and loading state for the Admin audit log. */
export function useAuditLogList() {
  return useAdminList(listAuditLogs, initial, { pageSize: 10 });
}

