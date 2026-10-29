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
