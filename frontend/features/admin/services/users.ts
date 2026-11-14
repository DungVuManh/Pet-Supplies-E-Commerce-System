import { apiGet, apiSend } from "@/lib/api-client";
import type { AdminUserDetail, AdminUserRow, Page, UserCounts, UserFilter, UserLockResult } from "../types";

export function listUsers(query: UserFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminUserRow, UserCounts>>("/api/v1/admin/users", query, { signal });
}

/** The changed fields, plus the `updatedAt` the form was loaded with. */
export type UserEdit = Partial<Pick<AdminUserDetail, "fullName" | "phone" | "role" | "status" | "adminNote">> & {
  expectedUpdatedAt: string;
  lockReason?: string;
};

export function updateUser(id: string, edit: UserEdit) {
  return apiSend<AdminUserDetail & { changed: boolean }>("PATCH", `/api/v1/admin/users/${encodeURIComponent(id)}`, edit);
}

export function lockUser(id: string, reason: string) {
  return apiSend<UserLockResult>("POST", `/api/v1/admin/users/${encodeURIComponent(id)}/lock`, { reason });
}

export function unlockUser(id: string) {
  return apiSend<UserLockResult>("POST", `/api/v1/admin/users/${encodeURIComponent(id)}/unlock`);
}

/** A new Staff account; the server sets the role, and the password is set by its owner from an email. */
export type UserCreate = { fullName: string; email: string; phone: string; adminNote: string };

export function createUser(user: UserCreate) {
  return apiSend<AdminUserDetail>("POST", "/api/v1/admin/users", user);
}
