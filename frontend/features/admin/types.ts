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
  updatedAt: string;
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

export type CategoryStatus = "active" | "hidden";
export type CategoryFilter = { q: string; status: CategoryStatus | "all" };

/**
 * One row of `GET /api/v1/admin/categories`, in tree order. `ref` addresses it in
 * URLs: the code, or the id for a category the migration has not reached.
 * `context` marks a parent shown only to keep a matching child in place.
 */
export type AdminCategoryRow = {
  id: string;
  ref: string;
  code: string | null;
  name: string;
  parentCode: string | null;
  isChild: boolean;
  status: CategoryStatus;
  productCount: number;
  context: boolean;
};

/** `GET /api/v1/admin/categories/:code`. `blocker` is the reason it cannot be deleted, or null. */
export type AdminCategoryDetail = {
  id: string;
  ref: string;
  code: string | null;
  name: string;
  slug: string;
  parentCode: string | null;
  parentName: string | null;
  description: string;
  displayOrder: number | null;
  status: CategoryStatus;
  updatedAt: string;
  productCount: number;
  hasChildren: boolean;
  blocker: string | null;
  parentOptions: { ref: string; name: string }[];
};

export type MasterDataKind = "petType" | "breed" | "brand" | "unit" | "shippingMethod";
export type MasterDataStatus = "active" | "inactive";
export type MasterDataFilter = { kind: MasterDataKind; q: string; status: MasterDataStatus | "all" };
export type MasterDataCounts = Record<MasterDataKind, number>;

/** One row of `GET /api/v1/admin/master-data`. `metric` depends on the kind: a count, a pet type name, or a fee. */
export type MasterDataRow = {
  code: string;
  name: string;
  description: string;
  metric: number | string;
  status: MasterDataStatus;
  updatedAt: string;
};

export type ProductStatus = "active" | "low" | "hidden";
export type ProductFilter = { tab: "all" | "active" | "hidden"; q: string; category: string; status: ProductStatus | "all" };
export type ProductCounts = { all: number; active: number; hidden: number };
export type ProductCategory = { ref: string; name: string; path: string };

/** One row of `GET /api/v1/admin/products`: one variant. `sku` addresses it in URLs. */
export type AdminProductRow = {
  sku: string;
  code: string;
  name: string;
  brand: string;
  unit: string;
  price: number;
  available: number;
  threshold: number;
  status: ProductStatus;
  categories: ProductCategory[];
};

/** `GET /api/v1/admin/products/:sku`. `cost` and `ownThreshold` are null when not set. */
export type AdminProductDetail = {
  sku: string;
  code: string;
  label: string;
  name: string;
  brand: string;
  unit: string;
  petType: string;
  description: string;
  images: string[];
  categories: ProductCategory[];
  price: number;
  cost: number | null;
  stock: number;
  reservedStock: number;
  available: number;
  threshold: number;
  ownThreshold: number | null;
  status: ProductStatus;
  isActive: boolean;
  hasOrders: boolean;
  updatedAt: string;
  lastUpdate: { at: string; actorName: string | null } | null;
  history: { id: string; at: string; title: string; actorName: string | null }[];
};

/** `GET /api/v1/admin/master-data/options`. */
export type ProductOptions = { petTypes: { code: string; name: string }[]; brands: { code: string; name: string }[]; units: { code: string; name: string }[] };

/** `POST /api/v1/admin/products/:sku/hide` and `/show`. */
export type ProductVisibilityResult = Pick<AdminProductDetail, "sku" | "isActive" | "status">;

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled";
export type OrderTab = "all" | "processing" | "shipping" | "completed" | "cancelled";
export type OrderStatusFilter = "all" | "pending" | "processing" | "shipping" | "completed" | "cancelled";
export type OrderFilter = { tab: OrderTab; q: string; status: OrderStatusFilter };
export type OrderCounts = Record<OrderTab, number>;
export type PaymentMethod = "COD" | "ONLINE" | "CASH";

/** One row of `GET /api/v1/admin/orders`. `phone` is "" when the order has none. */
export type AdminOrderRow = {
  orderCode: string;
  customerName: string;
  phone: string;
  createdAt: string;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
};

export type PermissionRole = "customer" | "staff" | "admin";

/** `GET /api/v1/admin/permissions`: fixed in code, so read-only here. */
export type PermissionMatrix = {
  items: { id: string; label: string; roles: Record<PermissionRole, boolean> }[];
  counts: Record<PermissionRole, number>;
};

export type UserCounts = { all: number; customer: number; staff: number };
export type UserFilter = { tab: UserRole | "all"; q: string; role: UserRole | "all"; status: UserStatus | "all" };
