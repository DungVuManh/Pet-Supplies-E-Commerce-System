import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { paginate } from "../../common/pagination.js";
import { searchFilter } from "../../common/search.js";
import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import { User } from "../../models/user.model.js";
import { orderCodeSchema, orderListQuerySchema } from "../../validators/admin/order.validator.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { buildOrderSearchFilter } from "../../validators/order.validator.js";
import { visibleOrders } from "../staff-analytics.helpers.js";

// `delivered` is not in the Order enum, but older documents have it and Staff analytics counts it as a sale.
const TAB_STATUSES = {
 processing: ["pending", "confirmed", "processing"],
 shipping: ["shipping"],
 completed: ["completed", "delivered"],
 cancelled: ["cancelled"],
};
// The status filter follows the badges: "Chờ xử lý" covers both pending and confirmed.
const FILTER_STATUSES = {
 pending: ["pending", "confirmed"],
 processing: ["processing"],
 shipping: TAB_STATUSES.shipping,
 completed: TAB_STATUSES.completed,
 cancelled: TAB_STATUSES.cancelled,
};

const ROW_FIELDS = "orderCode customerId guestInfo shippingAddress total paymentMethod orderStatus createdAt";

/** Checkout stores the literal text "null" for an empty address field, so that counts as missing. */
const present = (value) => (value && value !== "null" ? value : null);

const rowStatus = (status) => (status === "delivered" ? "completed" : status);

/** Codes, guest and recipient names, and phones on the order, plus the accounts that match. */
async function searchOrders(q) {
 const text = q.replace(/^#/, "").trim();
 if (!text) return {};
 // Text with no searchable word, such as "(", gives an empty filter, which must not mean every account.
 const accountFilter = searchFilter(text, ["fullName", "phone"]);
 const accounts = Object.keys(accountFilter).length ? await User.find(accountFilter).select("_id").lean() : [];
 return { $or: [buildOrderSearchFilter(text), { customerId: { $in: accounts.map((account) => account._id) } }] };
}

/** The name on the order first, then the account's name. */
export function orderCustomerName(order, account) {
 return present(order.guestInfo?.name) ?? present(order.shippingAddress?.recipientName) ?? account?.fullName ?? "Khách lẻ";
}

function orderRow(order, accounts) {
 const account = order.customerId ? accounts.get(String(order.customerId)) : null;
 return {
  orderCode: order.orderCode,
  customerName: orderCustomerName(order, account),
  phone: present(order.guestInfo?.phone) ?? present(order.shippingAddress?.phone) ?? account?.phone ?? "",
  createdAt: order.createdAt,
  total: order.total,
  paymentMethod: order.paymentMethod,
  status: rowStatus(order.orderStatus),
 };
}

async function tabCounts() {
 const groups = await Order.aggregate([
  { $match: visibleOrders },
  { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
 ]);
 const sum = (statuses) => groups.filter((group) => statuses.includes(group._id)).reduce((total, group) => total + group.count, 0);
 return {
  all: groups.reduce((total, group) => total + group.count, 0),
  ...Object.fromEntries(Object.entries(TAB_STATUSES).map(([tab, statuses]) => [tab, sum(statuses)])),
 };
}

/** The tab, status, and search as one filter, leaving out Staff sales still being created. */
async function orderFilter(query) {
 const conditions = [visibleOrders];
 if (query.tab !== "all") conditions.push({ orderStatus: { $in: TAB_STATUSES[query.tab] } });
 if (query.status !== "all") conditions.push({ orderStatus: { $in: FILTER_STATUSES[query.status] } });
 const search = await searchOrders(query.q);
 if (Object.keys(search).length > 0) conditions.push(search);
 return { $and: conditions };
}

/** The customer accounts of these orders, by id, for names and phones the order lacks. */
async function accountsOf(orders) {
 const accountIds = [...new Set(orders.map((order) => order.customerId).filter(Boolean).map(String))];
 const accounts = accountIds.length
  ? await User.find({ _id: { $in: accountIds } }).select("fullName phone").lean()
  : [];
 return new Map(accounts.map((account) => [String(account._id), account]));
}

/** Every channel, newest first. `counts` ignores the filters. */
export async function listOrders(request, response) {
 const query = parseQuery(orderListQuerySchema, request.query);
 const [page, counts] = await Promise.all([
  paginate(Order, await orderFilter(query), query, { select: ROW_FIELDS }),
  tabCounts(),
 ]);
 const byId = await accountsOf(page.items);

 response.json({
  success: true,
  data: { ...page, items: page.items.map((order) => orderRow(order, byId)), counts },
 });
}

export const ORDER_EXPORT_LIMIT = 5000;
const EXPORT_FIELDS = `${ROW_FIELDS} channel paymentStatus subtotal discount promotionCode`;

/**
 * Every order the list would show for these filters, across all pages, up to the
 * limit. The file holds customer names and phones, so each export is audited.
 */
export async function exportOrders(request, response) {
 const query = parseQuery(orderListQuerySchema, request.query);
 const filter = await orderFilter(query);
 const [orders, total] = await Promise.all([
  Order.find(filter).sort({ createdAt: -1, _id: -1 }).limit(ORDER_EXPORT_LIMIT).select(EXPORT_FIELDS).lean(),
  Order.countDocuments(filter),
 ]);
 const byId = await accountsOf(orders);
 const items = orders.map((order) => ({
  ...orderRow(order, byId),
  channel: order.channel ?? "online",
  paymentStatus: order.paymentStatus ?? null,
  subtotal: order.subtotal ?? order.total,
  discount: order.discount ?? 0,
  promotionCode: order.promotionCode ?? null,
 }));
 await recordAudit(request, {
  action: "order.export",
  target: { collectionName: "orders", id: "export" },
  after: { tab: query.tab, status: query.status, q: query.q, rows: items.length },
  summary: `Xuất danh sách đơn hàng: ${items.length} dòng`,
 });
 response.json({ success: true, data: { items, total, truncated: total > items.length } });
}

const orderNotFound = () => new AppError("Không tìm thấy đơn hàng.", 404, "NOT_FOUND");

function addressDto(address) {
 if (!address) return null;
 const fields = ["recipientName", "phone", "street", "ward", "district", "province"];
 const cleaned = Object.fromEntries(fields.map((field) => [field, present(address[field])]));
 return Object.values(cleaned).some(Boolean) ? cleaned : null;
}

/**
 * Read-only order detail for the Admin. Staff process orders, so it carries no
 * next statuses or live stock. Payment records and `firebaseUid` are never read.
 */
export async function getOrder(request, response) {
 const parsed = orderCodeSchema.safeParse(request.params.orderCode);
 if (!parsed.success) throw orderNotFound();
 const order = await Order.findOne({ orderCode: parsed.data, ...visibleOrders }).lean();
 if (!order) throw orderNotFound();

 const people = [order.customerId, order.createdByStaffId, ...(order.statusHistory ?? []).map((entry) => entry.by)].filter(Boolean).map(String);
 const [users, products] = await Promise.all([
  people.length ? User.find({ _id: { $in: [...new Set(people)] } }).select("fullName phone role").lean() : [],
  Product.find({ "variants.sku": { $in: order.items.map((item) => item.variantSku) } }).select("variants.sku").lean(),
 ]);
 const byId = new Map(users.map((user) => [String(user._id), user]));
 const liveSkus = new Set(products.flatMap((product) => product.variants.map((variant) => variant.sku)));
 const account = order.customerId ? byId.get(String(order.customerId)) : null;
 const nameOf = (id) => (id ? byId.get(String(id))?.fullName ?? null : null);

 response.json({
  success: true,
  data: {
   orderCode: order.orderCode,
   createdAt: order.createdAt,
   channel: order.channel ?? "online",
   status: rowStatus(order.orderStatus),
   paymentMethod: order.paymentMethod,
   paymentStatus: order.paymentStatus ?? null,
   paidAmount: order.paidAmount ?? null,
   needsReview: Boolean(order.needsReview),
   subtotal: order.subtotal,
   discount: order.discount ?? 0,
   // Removed from new orders on `dev`; only older orders still have one.
   shippingFee: order.shippingFee > 0 ? order.shippingFee : null,
   total: order.total,
   promotionCode: order.promotionCode ?? null,
   customer: {
    name: orderCustomerName(order, account),
    phone: present(order.guestInfo?.phone) ?? present(order.shippingAddress?.phone) ?? account?.phone ?? "",
    email: present(order.guestInfo?.email) ?? present(order.email) ?? null,
    // Only a Customer account has an Admin user page.
    accountId: account && account.role === "customer" ? String(account._id) : null,
    isGuest: !order.customerId,
   },
   shippingAddress: addressDto(order.shippingAddress),
   shipping: order.shipping?.carrier || order.shipping?.trackingNumber
    ? { carrier: order.shipping.carrier ?? "", trackingNumber: order.shipping.trackingNumber ?? "" } : null,
   createdByStaff: nameOf(order.createdByStaffId),
   items: order.items.map((item) => ({
    sku: item.variantSku,
    name: item.name,
    unitPrice: item.unitPrice,
    qty: item.qty,
    lineTotal: item.unitPrice * item.qty,
    image: item.image ?? null,
    productExists: liveSkus.has(item.variantSku),
   })),
   statusHistory: (order.statusHistory ?? []).map((entry) => ({ from: entry.from ?? null, to: rowStatus(entry.to), at: entry.at, actorName: nameOf(entry.by) }))
    .sort((a, b) => new Date(a.at) - new Date(b.at)),
  },
 });
}
