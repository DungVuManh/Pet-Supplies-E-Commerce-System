import { apiGet, apiSend } from "@/lib/api-client";
import type { AdminUserRow, Page, UserCounts, UserFilter, UserLockResult } from "../types";

export function listUsers(query: UserFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminUserRow, UserCounts>>("/api/v1/admin/users", query, { signal });
}

export function lockUser(id: string, reason: string) {
  return apiSend<UserLockResult>("POST", `/api/v1/admin/users/${encodeURIComponent(id)}/lock`, { reason });
}

export function unlockUser(id: string) {
  return apiSend<UserLockResult>("POST", `/api/v1/admin/users/${encodeURIComponent(id)}/unlock`);
}
