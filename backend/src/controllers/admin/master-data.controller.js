import { paginate } from "../../common/pagination.js";
import { searchFilter } from "../../common/search.js";
import { MASTER_DATA_KINDS, MasterData } from "../../models/master-data.model.js";
import { Product } from "../../models/product.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { masterDataListQuerySchema } from "../../validators/admin/master-data.validator.js";

const STATUS_FILTERS = { all: {}, active: { isActive: { $ne: false } }, inactive: { isActive: false } };

async function countBy(model, field, filter = {}) {
 const groups = await model.aggregate([{ $match: filter }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
 return new Map(groups.map((group) => [group._id, group.count]));
}

/** The computed column of each kind, never stored: returns a function from row to value. */
const metrics = {
 async petType() {
  const breeds = await countBy(MasterData, "petTypeCode", { kind: "breed" });
  return (row) => breeds.get(row.code) ?? 0;
 },
 async breed() {
  const petTypes = await MasterData.find({ kind: "petType" }).select("code name").lean();
  const names = new Map(petTypes.map((pet) => [pet.code, pet.name]));
  return (row) => names.get(row.petTypeCode) ?? "—";
 },
 // Products store brand and unit as names.
 async brand() {
  const products = await countBy(Product, "brand");
  return (row) => products.get(row.name) ?? 0;
 },
 async unit() {
  const products = await countBy(Product, "unit");
  return (row) => products.get(row.name) ?? 0;
 },
 async shippingMethod() {
  return (row) => row.fee ?? 0;
 },
};

export async function listMasterData(request, response) {
 const query = parseQuery(masterDataListQuerySchema, request.query);
 const filter = {
  kind: query.kind,
  ...STATUS_FILTERS[query.status],
  ...searchFilter(query.q, ["code", "name", "description"]),
 };
 const [page, counts, metric] = await Promise.all([
  paginate(MasterData, filter, query, { sort: { createdAt: 1, _id: 1 } }),
  countBy(MasterData, "kind"),
  metrics[query.kind](),
 ]);
 response.json({
  success: true,
  data: {
   ...page,
   items: page.items.map((row) => ({
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    metric: metric(row),
    status: row.isActive === false ? "inactive" : "active",
    updatedAt: row.updatedAt,
   })),
   counts: Object.fromEntries(MASTER_DATA_KINDS.map((kind) => [kind, counts.get(kind) ?? 0])),
  },
 });
}

/** Active values for the Admin product form. */
export async function listMasterDataOptions(_request, response) {
 const rows = await MasterData.find({ kind: { $in: ["petType", "brand", "unit"] }, isActive: { $ne: false } })
  .select("kind code name").sort({ createdAt: 1, _id: 1 }).lean();
 const ofKind = (kind) => rows.filter((row) => row.kind === kind).map(({ code, name }) => ({ code, name }));
 response.json({ success: true, data: { petTypes: ofKind("petType"), brands: ofKind("brand"), units: ofKind("unit") } });
}
