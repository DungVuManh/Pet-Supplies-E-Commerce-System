import "server-only";
import { serverGet } from "@/lib/server-api";
import type { AdminUserDetail } from "../types";

/** Renders the not-found page for an unknown id; call it inside a Suspense child. */
export function getUser(id: string) {
  return serverGet<AdminUserDetail>(`/api/v1/admin/users/${encodeURIComponent(id)}`);
}
