import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { sendFieldErrors, zodFieldErrors } from "../../common/field-errors.js";
import { nextMasterDataCode } from "../../common/master-data-code.js";
import { paginate } from "../../common/pagination.js";
import { searchFilter } from "../../common/search.js";
import { MASTER_DATA_KINDS, MasterData } from "../../models/master-data.model.js";
import { Product } from "../../models/product.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import {
 masterDataCreateSchema, masterDataKindSchema, masterDataListQuerySchema, masterDataPatchSchema,
} from "../../validators/admin/master-data.validator.js";

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

const KIND_LABELS = { petType: "loài thú cưng", breed: "giống", brand: "thương hiệu", unit: "đơn vị", shippingMethod: "phương thức vận chuyển" };
const FIELD_LABELS = { name: "tên", description: "mô tả", isActive: "trạng thái", petTypeCode: "loài", fee: "phí" };
const CODE_ATTEMPTS = 3;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notFound = () => new AppError("Không tìm thấy dữ liệu nền.", 404, "NOT_FOUND");

/** `kind` from the URL; an unknown one is a missing row, not a validation error. */
function parseKind(kind) {
 const parsed = masterDataKindSchema.safeParse(kind);
 if (!parsed.success) throw notFound();
 return parsed.data;
}

async function findRow(kind, code) {
 const row = await MasterData.findOne({ kind, code: String(code).toUpperCase() }).lean();
 if (!row) throw notFound();
 return row;
}

/** Names are unique per kind, and per pet type for breeds, ignoring case. Returns the error message or null. */
async function duplicateName(kind, name, petTypeCode, excludeId) {
 const filter = {
  kind,
  name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  ...(kind === "breed" && { petTypeCode }),
  ...(excludeId && { _id: { $ne: excludeId } }),
 };
 return (await MasterData.exists(filter)) ? `Tên ${KIND_LABELS[kind]} đã tồn tại.` : null;
}

/** A breed's pet type must be an active pet type. */
async function petTypeError(code) {
 const found = await MasterData.exists({ kind: "petType", code, isActive: { $ne: false } });
 return found ? null : "Loài thú cưng không tồn tại hoặc đã ngừng dùng.";
}

/**
 * What stops a rename or a delete. Products store brand and unit as names, so a
 * brand or unit in use keeps its name; a pet type with breeds keeps existing.
 */
async function usage(row) {
 if (row.kind === "brand" || row.kind === "unit") {
  const products = await Product.countDocuments({ [row.kind]: row.name });
  const reason = products > 0 ? `đang dùng cho ${products} sản phẩm` : null;
  return { renameBlocked: reason, blocker: reason };
 }
 if (row.kind === "petType") {
  const breeds = await MasterData.countDocuments({ kind: "breed", petTypeCode: row.code });
  return { renameBlocked: null, blocker: breeds > 0 ? `còn ${breeds} giống thuộc loài này` : null };
 }
 return { renameBlocked: null, blocker: null };
}

async function rowDetail(row) {
 return {
  kind: row.kind,
  code: row.code,
  name: row.name,
  description: row.description ?? "",
  petTypeCode: row.kind === "breed" ? row.petTypeCode ?? null : null,
  fee: row.kind === "shippingMethod" ? row.fee ?? 0 : null,
  status: row.isActive === false ? "inactive" : "active",
  updatedAt: row.updatedAt,
  ...(await usage(row)),
 };
}

const conflict = (response, fields, code = "DUPLICATE_VALUE") =>
 sendFieldErrors(response, fields, { status: 409, code, message: Object.values(fields)[0] });

export async function getMasterData(request, response) {
 const row = await findRow(parseKind(request.params.kind), request.params.code);
 response.json({ success: true, data: await rowDetail(row) });
}

/**
 * Creates a row with a code made like the seed's. Two Admins creating at once can
 * pick the same code; the unique index refuses the second, which then retries.
 */
export async function createMasterData(request, response) {
 const { kind: rawKind, ...body } = request.body ?? {};
 const kindResult = masterDataKindSchema.safeParse(rawKind);
 if (!kindResult.success) return sendFieldErrors(response, { kind: "Loại dữ liệu nền không hợp lệ." });
 const kind = kindResult.data;
 const parsed = masterDataCreateSchema(kind).safeParse(body);
 if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));
 const input = parsed.data;

 if (kind === "breed") {
  const error = await petTypeError(input.petTypeCode);
  if (error) return sendFieldErrors(response, { petTypeCode: error });
 }
 const duplicate = await duplicateName(kind, input.name, input.petTypeCode);
 if (duplicate) return conflict(response, { name: duplicate });

 let created = null;
 for (let attempt = 1; !created; attempt += 1) {
  const taken = (await MasterData.find({ kind }).select("code").lean()).map((row) => row.code);
  try {
   created = (await MasterData.create({ kind, ...input, code: nextMasterDataCode(kind, input.name, taken) })).toObject();
  } catch (error) {
   if (error?.code !== 11000) throw error;
   if (attempt >= CODE_ATTEMPTS) throw new AppError("Chưa thể cấp mã. Vui lòng thử lại.", 409, "CODE_CONFLICT");
  }
 }

 await recordAudit(request, {
  action: "masterData.create",
  target: { collectionName: "masterData", id: created._id },
  after: { kind, code: created.code, ...input },
  summary: `Tạo ${KIND_LABELS[kind]} ${created.code} ${created.name}`,
 });
 response.status(201).json({ success: true, data: await rowDetail(created) });
}

const currentValue = (row, field) => {
 if (field === "isActive") return row.isActive !== false;
 if (field === "description") return row.description ?? "";
 return row[field];
};

/** Edits a row; the code never changes. The write is conditional on the `updatedAt` the modal loaded. */
export async function updateMasterData(request, response) {
 const kind = parseKind(request.params.kind);
 const parsed = masterDataPatchSchema(kind).safeParse(request.body);
 if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));
 const { expectedUpdatedAt, ...input } = parsed.data;

 const row = await findRow(kind, request.params.code);
 const stale = () => new AppError("Dữ liệu vừa được thay đổi ở nơi khác. Dữ liệu mới nhất đã được tải lại.", 409, "STALE_MASTER_DATA");
 if (new Date(row.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) throw stale();

 const before = {};
 const after = {};
 for (const [field, value] of Object.entries(input)) {
  if (value !== currentValue(row, field)) { before[field] = currentValue(row, field); after[field] = value; }
 }
 if (Object.keys(after).length === 0) return response.json({ success: true, data: { ...(await rowDetail(row)), changed: false } });

 if (after.petTypeCode) {
  const error = await petTypeError(after.petTypeCode);
  if (error) return sendFieldErrors(response, { petTypeCode: error });
 }
 // Products match the exact name, so even a change of case is a rename.
 if (after.name !== undefined) {
  const { renameBlocked } = await usage(row);
  if (renameBlocked) return conflict(response, { name: `Không thể đổi tên: ${renameBlocked}. Hãy ngừng dùng và tạo mới.` }, "MASTER_DATA_IN_USE");
 }
 if (after.name !== undefined || after.petTypeCode) {
  const duplicate = await duplicateName(kind, after.name ?? row.name, after.petTypeCode ?? row.petTypeCode, row._id);
  if (duplicate) return conflict(response, { name: duplicate });
 }

 const result = await MasterData.updateOne({ _id: row._id, updatedAt: row.updatedAt }, { $set: after }, { runValidators: true });
 if (result.matchedCount === 0) throw stale();

 await recordAudit(request, {
  action: "masterData.update",
  target: { collectionName: "masterData", id: row._id },
  before,
  after,
  summary: `Cập nhật ${KIND_LABELS[kind]} ${row.code}: ${Object.keys(after).map((field) => FIELD_LABELS[field]).join(", ")}`,
 });
 const updated = await MasterData.findById(row._id).lean();
 response.json({ success: true, data: { ...(await rowDetail(updated)), changed: true } });
}

/** Refused for a brand or unit in use and a pet type with breeds; those can be deactivated instead. */
export async function deleteMasterData(request, response) {
 const kind = parseKind(request.params.kind);
 const row = await findRow(kind, request.params.code);
 const { blocker } = await usage(row);
 if (blocker) throw new AppError(`Không thể xóa “${row.name}”: ${blocker}. Hãy chuyển sang ngừng dùng.`, 409, "MASTER_DATA_IN_USE");

 await MasterData.deleteOne({ _id: row._id });
 await recordAudit(request, {
  action: "masterData.delete",
  target: { collectionName: "masterData", id: row._id },
  before: { kind, code: row.code, name: row.name, description: row.description, petTypeCode: row.petTypeCode, fee: row.fee, isActive: row.isActive },
  summary: `Xóa ${KIND_LABELS[kind]} ${row.code} ${row.name}`,
 });
 response.json({ success: true, data: { kind, code: row.code } });
}
