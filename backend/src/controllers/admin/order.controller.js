import { paginate } from "../../common/pagination.js";
import { searchFilter } from "../../common/search.js";
import { Order } from "../../models/order.model.js";
import { User } from "../../models/user.model.js";
import { orderListQuerySchema } from "../../validators/admin/order.validator.js";
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

/** Every channel, newest first, leaving out Staff sales still being created. `counts` ignores the filters. */
export async function listOrders(request, response) {
 const query = parseQuery(orderListQuerySchema, request.query);
 const conditions = [visibleOrders];
 if (query.tab !== "all") conditions.push({ orderStatus: { $in: TAB_STATUSES[query.tab] } });
 if (query.status !== "all") conditions.push({ orderStatus: { $in: FILTER_STATUSES[query.status] } });
 const search = await searchOrders(query.q);
 if (Object.keys(search).length > 0) conditions.push(search);

 const [page, counts] = await Promise.all([
  paginate(Order, { $and: conditions }, query, { select: ROW_FIELDS }),
  tabCounts(),
 ]);
 const accountIds = [...new Set(page.items.map((order) => order.customerId).filter(Boolean).map(String))];
 const accounts = accountIds.length
  ? await User.find({ _id: { $in: accountIds } }).select("fullName phone").lean()
  : [];
 const byId = new Map(accounts.map((account) => [String(account._id), account]));

 response.json({
  success: true,
  data: { ...page, items: page.items.map((order) => orderRow(order, byId)), counts },
 });
}
