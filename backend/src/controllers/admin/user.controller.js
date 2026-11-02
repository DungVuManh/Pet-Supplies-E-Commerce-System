import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { paginate } from "../../common/pagination.js";
import { searchFilter } from "../../common/search.js";
import { getFirebaseAuth } from "../../config/firebase.js";
import { Address } from "../../models/address.model.js";
import { AuditLog } from "../../models/audit-log.model.js";
import { Order } from "../../models/order.model.js";
import { User } from "../../models/user.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { parseLockBody, userListQuerySchema } from "../../validators/admin/user.validator.js";
import { visibleOrders } from "../staff-analytics.helpers.js";

const MANAGED_ROLES = ["customer", "staff"];
const CODE_PREFIXES = { customer: "KH", staff: "NV" };
const ACTIVITY_LIMIT = 10;
// `delivered` is not in the Order enum, but older documents have it and Staff analytics counts it as a sale.
const FINISHED_ORDER_STATUSES = ["completed", "delivered"];
const STATUS_FILTERS = {
 all: {},
 active: { status: { $ne: "locked" } },
 locked: { status: "locked" },
};

/** Display code, derived and never stored: the role prefix plus the last 6 characters of the id. */
function accountCode(user) {
 return CODE_PREFIXES[user.role] + String(user._id).slice(-6).toUpperCase();
}

// `accountCode` as a MongoDB expression, so search can match the derived value.
const accountCodeExpression = {
 $concat: [
  { $cond: [{ $eq: ["$role", "staff"] }, CODE_PREFIXES.staff, CODE_PREFIXES.customer] },
  { $toUpper: { $substrCP: [{ $toString: "$_id" }, 18, 6] } },
 ],
};

function userRow(user) {
 return {
  id: String(user._id),
  code: accountCode(user),
  role: user.role,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  joinedAt: user.createdAt,
  status: user.status === "locked" ? "locked" : "active",
 };
}

/** Customer and Staff accounts; Admin accounts never appear. `counts` ignores the filters. */
export async function listUsers(request, response) {
 const query = parseQuery(userListQuerySchema, request.query);
 const roles = MANAGED_ROLES.filter((role) => [query.tab, query.role].every((value) => value === "all" || value === role));
 const filter = {
  role: { $in: roles },
  ...STATUS_FILTERS[query.status],
  ...searchFilter(query.q, ["fullName", "email", "phone"], [accountCodeExpression]),
 };
 const [page, customer, staff] = await Promise.all([
  paginate(User, filter, query, { select: "role fullName email phone createdAt status" }),
  User.countDocuments({ role: "customer" }),
  User.countDocuments({ role: "staff" }),
 ]);
 response.json({
  success: true,
  data: { ...page, items: page.items.map(userRow), counts: { all: customer + staff, customer, staff } },
 });
}

const userNotFound = () => new AppError("Không tìm thấy người dùng.", 404, "NOT_FOUND");

async function findUser(id) {
 // Anything but a full ObjectId is an unknown user, not a query error.
 const user = /^[0-9a-f]{24}$/i.test(id) ? await User.findById(id).lean() : null;
 if (!user) throw userNotFound();
 return user;
}

/** The orders a user is credited with: their purchases, or the sales a Staff member created. */
function ownOrders(user) {
 return { ...visibleOrders, ...(user.role === "staff" ? { createdByStaffId: user._id } : { customerId: user._id }) };
}

async function orderTotals(user) {
 const [totals] = await Order.aggregate([
  { $match: { ...ownOrders(user), orderStatus: { $in: FINISHED_ORDER_STATUSES } } },
  { $group: {
   _id: null,
   completedOrders: { $sum: 1 },
   totalSpent: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0] } },
  } },
 ]);
 return { completedOrders: totals?.completedOrders ?? 0, totalSpent: totals?.totalSpent ?? 0 };
}

/** From Firebase, and `null` when unavailable: a missing value is never invented. */
async function lastSignIn(request, user) {
 try {
  const { metadata } = await getFirebaseAuth(request.app.locals.config).getUser(user.firebaseUid);
  if (!metadata.lastSignInTime) return null;
  const date = new Date(metadata.lastSignInTime);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
 } catch {
  return null;
 }
}

function orderActivity(order) {
 const [first, ...others] = order.items;
 return {
  id: `order-${order._id}`,
  at: order.createdAt,
  title: `Tạo đơn #${order.orderCode}`,
  detail: `${first.name} · Số lượng ${first.qty}${others.length ? ` và ${others.length} sản phẩm khác` : ""}`,
  amount: order.total,
  status: FINISHED_ORDER_STATUSES.includes(order.orderStatus) ? "completed" : order.orderStatus,
  href: `/admin/orders?q=${encodeURIComponent(order.orderCode)}`,
 };
}

function auditActivity(entry) {
 return {
  id: `audit-${entry._id}`,
  at: entry.at,
  title: entry.summary || entry.action,
  detail: `Thực hiện bởi ${entry.actorId?.fullName || "tài khoản không xác định"}`,
  amount: null,
  status: entry.result || "success",
  href: "/admin/system/audit-log",
 };
}

async function recentActivity(user) {
 const [orders, entries] = await Promise.all([
  Order.find(ownOrders(user)).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT)
   .select("orderCode total orderStatus items createdAt").lean(),
  AuditLog.find({ "target.collectionName": "users", "target.id": String(user._id) }).sort({ at: -1 }).limit(ACTIVITY_LIMIT)
   .populate("actorId", "fullName").lean(),
 ]);
 return [...orders.map(orderActivity), ...entries.map(auditActivity)]
  .sort((a, b) => new Date(b.at) - new Date(a.at))
  .slice(0, ACTIVITY_LIMIT);
}

function addressDto(address) {
 if (!address) return null;
 const { recipientName, phone, street, ward, district, province } = address;
 return { recipientName, phone, street, ward, district, province };
}

export async function getUser(request, response) {
 const user = await findUser(request.params.id);
 // Admin accounts are not managed here, so they look the same as an unknown id.
 if (!MANAGED_ROLES.includes(user.role)) throw userNotFound();
 const [address, totals, lastSignInAt, activity] = await Promise.all([
  Address.findOne({ userId: user._id, isDefault: true }).lean(),
  orderTotals(user),
  lastSignIn(request, user),
  recentActivity(user),
 ]);
 response.json({
  success: true,
  data: {
   ...userRow(user),
   lockedAt: user.lockedAt ?? null,
   lockReason: user.lockReason ?? null,
   adminNote: user.adminNote ?? "",
   lastSignInAt,
   defaultAddress: addressDto(address),
   ...totals,
   activity,
  },
 });
}

/** The account a lock or unlock may change: never the caller's own, never an Admin. */
async function findLockTarget(request) {
 if (String(request.user._id) === request.params.id.toLowerCase()) {
  throw new AppError("Bạn không thể khóa hoặc mở khóa tài khoản của chính mình.", 403, "CANNOT_CHANGE_SELF");
 }
 const user = await findUser(request.params.id);
 if (!MANAGED_ROLES.includes(user.role)) {
  throw new AppError("Không thể khóa hoặc mở khóa tài khoản quản trị.", 403, "CANNOT_CHANGE_ADMIN");
 }
 return user;
}

async function revokeSessions(request, user) {
 try {
  await getFirebaseAuth(request.app.locals.config).revokeRefreshTokens(user.firebaseUid);
 } catch (error) {
  // An account deleted from Firebase has no sessions left to revoke.
  if (error?.code === "auth/user-not-found") return;
  console.warn("[admin] Could not revoke user sessions", { code: typeof error?.code === "string" ? error.code : "unknown" });
  throw new AppError("Chưa thể thu hồi phiên đăng nhập. Vui lòng thử lại.", 503, "AUTH_UNAVAILABLE");
 }
}

function lockDto(user) {
 return { id: String(user._id), status: user.status, lockedAt: user.lockedAt ?? null, lockReason: user.lockReason ?? null };
}

const alreadyLocked = () => new AppError("Tài khoản này đã bị khóa trước đó.", 409, "ALREADY_LOCKED");
const notLocked = () => new AppError("Tài khoản này không ở trạng thái khóa.", 409, "NOT_LOCKED");

/**
 * Sessions are revoked before the status is written, so a revocation failure
 * leaves the status unchanged and the Admin can retry. The update is conditional
 * on the current status, so concurrent requests take effect once.
 */
export async function lockUser(request, response) {
 const { reason } = parseLockBody(request.body);
 const user = await findLockTarget(request);
 if (user.status === "locked") throw alreadyLocked();
 await revokeSessions(request, user);
 const updated = await User.findOneAndUpdate(
  { _id: user._id, status: { $ne: "locked" } },
  { $set: { status: "locked", lockedAt: new Date(), lockedBy: request.user._id, lockReason: reason } },
  { new: true, runValidators: true },
 ).lean();
 if (!updated) throw alreadyLocked();
 await recordAudit(request, {
  action: "user.lock",
  target: { collectionName: "users", id: user._id },
  before: { status: "active" },
  after: { status: "locked", lockReason: reason },
  summary: `Khóa tài khoản ${accountCode(user)}: ${reason}`,
 });
 response.json({ success: true, data: lockDto(updated) });
}

export async function unlockUser(request, response) {
 const user = await findLockTarget(request);
 if (user.status !== "locked") throw notLocked();
 // A session created while the lock was being written must not come back to life.
 await revokeSessions(request, user);
 const updated = await User.findOneAndUpdate(
  { _id: user._id, status: "locked" },
  { $set: { status: "active" }, $unset: { lockedAt: 1, lockedBy: 1, lockReason: 1 } },
  { new: true, runValidators: true },
 ).lean();
 if (!updated) throw notLocked();
 await recordAudit(request, {
  action: "user.unlock",
  target: { collectionName: "users", id: user._id },
  before: { status: "locked", lockReason: user.lockReason },
  after: { status: "active" },
  summary: `Mở khóa tài khoản ${accountCode(user)}`,
 });
 response.json({ success: true, data: lockDto(updated) });
}
