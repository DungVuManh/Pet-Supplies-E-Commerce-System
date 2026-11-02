import "server-only";
import { serverGet } from "@/lib/server-api";
import type { PermissionMatrix } from "../types";

/** Call it inside a Suspense child: it reads the session cookie. */
export function getPermissions() {
  return serverGet<PermissionMatrix>("/api/v1/admin/permissions");
}
