"use client";

import { listUsers } from "../services/users";
import type { UserFilter } from "../types";
import { useAdminList } from "./use-admin-list";

const initial: UserFilter = { tab: "all", q: "", role: "all", status: "all" };

/** Filters, paging, and loading state for the Admin user list. */
export function useUsersList() {
  return useAdminList(listUsers, initial);
}
