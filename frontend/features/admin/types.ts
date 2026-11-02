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

export type UserActivityStatus = "pending" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled" | "success" | "denied";

/** One entry of a user's history, merged from their orders and the audit log. `amount` is set for orders. */
export type UserActivity = {
  id: string;
  at: string;
  title: string;
  detail: string;
  amount: number | null;
  status: UserActivityStatus;
  href: string;
};

export type UserAddress = { recipientName: string; phone: string; street: string; ward: string; district: string; province: string };

/** `GET /api/v1/admin/users/:id`. `lastSignInAt` is null when Firebase cannot provide it. */
export type AdminUserDetail = AdminUserRow & {
  lockedAt: string | null;
  lockReason: string | null;
  adminNote: string;
  lastSignInAt: string | null;
  defaultAddress: UserAddress | null;
  completedOrders: number;
  totalSpent: number;
  activity: UserActivity[];
};

/** `POST /api/v1/admin/users/:id/lock` and `/unlock`. */
export type UserLockResult = Pick<AdminUserDetail, "id" | "status" | "lockedAt" | "lockReason">;

export type UserCounts = { all: number; customer: number; staff: number };
export type UserFilter = { tab: UserRole | "all"; q: string; role: UserRole | "all"; status: UserStatus | "all" };
