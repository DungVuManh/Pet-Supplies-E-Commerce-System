import { apiGet } from "@/lib/api-client";
import type { AdminUserRow, Page, UserCounts, UserFilter } from "../types";

export function listUsers(query: UserFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminUserRow, UserCounts>>("/api/v1/admin/users", query, { signal });
}
