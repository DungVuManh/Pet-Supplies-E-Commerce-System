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

/** An export: every matching row up to the server's limit. `truncated` means `total` is larger than `items`. */
export type ExportPage<T> = { items: T[]; total: number; truncated: boolean };

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

export type OverviewPreset = "this-month" | "last-month" | "this-quarter";

/** A count or amount in the period; `growthPercent` is null when the previous period gives no comparison. */
export type OverviewMetric = { value: number; growthPercent: number | null };

/** One row of the dashboard's recent activity. `value` is already formatted, or null when it doesn't apply. */
export type OverviewActivity = {
  id: string;
  time: string;
  title: string;
  detail: string;
  value: string | null;
  status: UserActivityStatus | UserStatus;
  href: string;
};

/** `GET /api/v1/admin/overview`. A metric that failed to load is null. */
export type AdminOverview = {
  generatedAt: string;
  period: { preset: OverviewPreset | null; from: string; to: string };
  revenue: OverviewMetric | null;
  orders: OverviewMetric | null;
  newCustomers: OverviewMetric | null;
  lowStock: { total: number; items: { sku: string; name: string; available: number; threshold: number }[] } | null;
  recentActivity: OverviewActivity[] | null;
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
/** `Category.petType`: the storefront shows a category for that pet and for `both`. */
export type CategoryPetType = "dog" | "cat" | "both";
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
  status: CategoryStatus;
  productCount: number;
};

/** `GET /api/v1/admin/categories/:code`. `blocker` is the reason it cannot be deleted, or null. */
export type AdminCategoryDetail = {
  id: string;
  ref: string;
  code: string | null;
  name: string;
  slug: string;
  petType: CategoryPetType;
  description: string;
  displayOrder: number | null;
  status: CategoryStatus;
  updatedAt: string;
  productCount: number;
  blocker: string | null;
};

export type MasterDataKind = "petType" | "breed" | "brand" | "unit" | "shippingMethod";
export type MasterDataStatus = "active" | "inactive";
export type MasterDataFilter = { kind: MasterDataKind; q: string; status: MasterDataStatus | "all" };
export type MasterDataCounts = Record<MasterDataKind, number>;
/**
 * `GET /api/v1/admin/master-data/:kind/:code`. `petTypeCode` is set for breeds and
 * `fee` for shipping methods. `renameBlocked` and `blocker` say why the name
 * cannot change or the row cannot be deleted, or are null.
 */
export type MasterDataDetail = {
  kind: MasterDataKind;
  code: string;
  name: string;
  description: string;
  petTypeCode: string | null;
  fee: number | null;
  status: MasterDataStatus;
  updatedAt: string;
  renameBlocked: string | null;
  blocker: string | null;
};

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

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

/** A row of `GET /api/v1/admin/orders/export`: the list row plus the amounts and payment state. */
export type AdminOrderExportRow = AdminOrderRow & {
  channel: "online" | "offline";
  paymentStatus: PaymentStatus | null;
  subtotal: number;
  discount: number;
  promotionCode: string | null;
};

/**
 * `GET /api/v1/admin/orders/:orderCode`, read-only. `shippingFee` is set only on older
 * orders. `customer.accountId` links a Customer account; `productExists` says the SKU still exists.
 */
export type AdminOrderDetail = {
  orderCode: string;
  createdAt: string;
  channel: "online" | "offline";
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus | null;
  paidAmount: number | null;
  needsReview: boolean;
  subtotal: number;
  discount: number;
  shippingFee: number | null;
  total: number;
  promotionCode: string | null;
  customer: { name: string; phone: string; email: string | null; accountId: string | null; isGuest: boolean };
  shippingAddress: { recipientName: string | null; phone: string | null; street: string | null; ward: string | null; district: string | null; province: string | null } | null;
  shipping: { carrier: string; trackingNumber: string } | null;
  createdByStaff: string | null;
  items: { sku: string; name: string; unitPrice: number; qty: number; lineTotal: number; image: string | null; productExists: boolean }[];
  statusHistory: { from: OrderStatus | null; to: OrderStatus; at: string; actorName: string | null }[];
};

export type PermissionRole = "customer" | "staff" | "admin";

/** `GET /api/v1/admin/permissions`: fixed in code, so read-only here. */
export type PermissionMatrix = {
  items: { id: string; label: string; roles: Record<PermissionRole, boolean> }[];
  counts: Record<PermissionRole, number>;
};

export type UserCounts = { all: number; customer: number; staff: number };
export type UserFilter = { tab: UserRole | "all"; q: string; role: UserRole | "all"; status: UserStatus | "all" };

export type VoucherType = "percent" | "fixed";
export type VoucherState = "active" | "scheduled" | "expired" | "disabled" | "exhausted";
/** The list's tabs; "ended" joins expired and used-up vouchers. */
export type VoucherTab = "all" | "active" | "scheduled" | "ended" | "disabled";
export type VoucherFilter = { tab: VoucherTab; q: string };
export type VoucherCounts = Record<VoucherTab, number>;

/** What the voucher form edits. Dates are Vietnam calendar days, `YYYY-MM-DD`. */
export type VoucherFields = {
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  oncePerCustomer: boolean;
  isPublic: boolean;
};

/** One row of `GET /api/v1/admin/vouchers`. `discountGiven` counts only uses that still stand. */
export type AdminVoucherRow = VoucherFields & { usedCount: number; state: VoucherState; discountGiven: number };

/** `GET /api/v1/admin/vouchers/:code`. `lockedFields` is filled once the voucher has been used. */
export type AdminVoucherDetail = AdminVoucherRow & { updatedAt: string; used: boolean; lockedFields: ("code" | "type" | "value")[] };
