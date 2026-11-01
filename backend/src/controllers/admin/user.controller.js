import { paginate } from "../../common/pagination.js";
import { searchFilter } from "../../common/search.js";
import { User } from "../../models/user.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { userListQuerySchema } from "../../validators/admin/user.validator.js";

const MANAGED_ROLES = ["customer", "staff"];
const CODE_PREFIXES = { customer: "KH", staff: "NV" };
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
