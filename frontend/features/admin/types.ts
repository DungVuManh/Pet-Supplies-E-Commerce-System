// Data shapes returned by the Admin API (`/api/v1/admin/...`).

export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

/** Tab or filter counts returned beside a list, such as `{ all, customer, staff }`. */
export type ListCounts = Record<string, number>;

/** One page of an Admin list. */
export type Page<T, C extends ListCounts = ListCounts> = {
  items: T[];
  pagination: Pagination;
  counts?: C;
};

export type UserRole = "customer" | "staff";
export type UserStatus = "active" | "locked";

/** One row of `GET /api/v1/admin/users`. `code` is the display code; `id` addresses the user in URLs. */
export type AdminUserRow = {
  id: string;
  code: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  joinedAt: string;
  status: UserStatus;
};

export type UserCounts = { all: number; customer: number; staff: number };
export type UserFilter = { tab: UserRole | "all"; q: string; role: UserRole | "all"; status: UserStatus | "all" };
