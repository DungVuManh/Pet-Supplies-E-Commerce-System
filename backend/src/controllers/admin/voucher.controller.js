import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { sendFieldErrors, zodFieldErrors } from "../../common/field-errors.js";
import { pageDto } from "../../common/pagination.js";
import { accentInsensitiveRegex, searchTokens } from "../../common/search.js";
import {
 normalizeVoucherCode, vietnamDate, vietnamDayEnd, vietnamDayStart, vietnamLastDate, voucherState, voucherUsedCount,
} from "../../common/voucher-rules.js";
import { Order } from "../../models/order.model.js";
import { PromotionRedemption } from "../../models/promotion-redemption.model.js";
import { Promotion } from "../../models/promotion.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { voucherFieldsSchema, voucherListQuerySchema, voucherPatchSchema } from "../../validators/admin/voucher.validator.js";

const DUPLICATE_MESSAGE = "Mã voucher đã tồn tại.";
const LOCKED_FIELDS = ["code", "type", "value"];
const LOCKED_MESSAGE = "Voucher đã được sử dụng nên không thể đổi trường này.";
// Matches a voucher nothing has spent yet, including documents from before usage counting.
const UNSPENT = { usedCount: { $in: [0, null] } };
const FIELD_LABELS = {
 code: "mã", name: "tên", type: "loại", value: "giá trị", maxDiscount: "mức tối đa", minOrderAmount: "đơn tối thiểu",
 startDate: "ngày bắt đầu", endDate: "ngày kết thúc", usageLimit: "giới hạn lượt dùng", oncePerCustomer: "giới hạn mỗi khách", isPublic: "hiển thị",
};

const notFound = () => new AppError("Không tìm thấy voucher.", 404, "NOT_FOUND");
const stale = () => new AppError("Voucher vừa được thay đổi ở nơi khác. Dữ liệu mới nhất đã được tải lại.", 409, "STALE_VOUCHER");
const duplicate = (response) => sendFieldErrors(response, { code: DUPLICATE_MESSAGE }, { status: 409, code: "DUPLICATE_VALUE", message: DUPLICATE_MESSAGE });

/** The list tabs join "used up" with "expired", since neither can be redeemed again without an edit. */
const tabOf = (state) => (state === "expired" || state === "exhausted" ? "ended" : state);

async function findVoucher(ref) {
 const voucher = await Promotion.findOne({ code: normalizeVoucherCode(ref) }).lean();
 if (!voucher) throw notFound();
 return voucher;
}

/** Values in the form's terms. Dates are Vietnam calendar days. */
const formFields = (voucher) => ({
 code: voucher.code,
 name: voucher.name ?? "",
 type: voucher.type,
 value: voucher.value,
 maxDiscount: voucher.maxDiscount ?? null,
 minOrderAmount: voucher.minOrderAmount ?? 0,
 startDate: vietnamDate(voucher.startAt),
 endDate: vietnamLastDate(voucher.endAt),
 usageLimit: voucher.usageLimit ?? null,
 oncePerCustomer: voucher.oncePerCustomer !== false,
 isPublic: voucher.isPublic === true,
});

const voucherRow = (voucher, now, discountGiven = 0) => ({
 ...formFields(voucher),
 usedCount: voucherUsedCount(voucher),
 state: voucherState(voucher, now),
 discountGiven,
});

/** Total discount per voucher, counting only uses that still stand. */
async function discountsGiven(vouchers) {
 if (vouchers.length === 0) return new Map();
 const totals = await PromotionRedemption.aggregate([
  { $match: { promotionId: { $in: vouchers.map((voucher) => voucher._id) }, status: "active" } },
  { $group: { _id: "$promotionId", total: { $sum: "$discount" } } },
 ]);
 return new Map(totals.map((row) => [String(row._id), row.total]));
}

/** Filtered in memory, because tabs derive from the clock and the usage count, and the list stays small. */
export async function listVouchers(request, response) {
 const query = parseQuery(voucherListQuerySchema, request.query);
 const now = new Date();
 const tokens = searchTokens(query.q);
 const all = (await Promotion.find().sort({ createdAt: -1, _id: -1 }).lean())
  .filter((voucher) => tokens.every((token) => accentInsensitiveRegex(token).test(`${voucher.code} ${voucher.name ?? ""}`)));

 const counts = { all: all.length, active: 0, scheduled: 0, ended: 0, disabled: 0 };
 for (const voucher of all) counts[tabOf(voucherState(voucher, now))] += 1;

 const matching = query.tab === "all" ? all : all.filter((voucher) => tabOf(voucherState(voucher, now)) === query.tab);
 const start = (query.page - 1) * query.pageSize;
 const page = matching.slice(start, start + query.pageSize);
 const given = await discountsGiven(page);
 response.json({
  success: true,
  data: {
   ...pageDto(page.map((voucher) => voucherRow(voucher, now, given.get(String(voucher._id)) ?? 0)), matching.length, query),
   counts,
  },
 });
}

/** A released redemption still counts: its cancelled order keeps showing the code. */
async function isUsed(voucher) {
 if (voucherUsedCount(voucher) > 0) return true;
 const [redemption, order] = await Promise.all([
  PromotionRedemption.exists({ promotionId: voucher._id }),
  Order.exists({ promotionCode: voucher.code }),
 ]);
 return Boolean(redemption || order);
}

async function voucherDetail(voucher, now = new Date()) {
 const [used, given] = await Promise.all([isUsed(voucher), discountsGiven([voucher])]);
 return {
  ...voucherRow(voucher, now, given.get(String(voucher._id)) ?? 0),
  updatedAt: voucher.updatedAt,
  used,
  lockedFields: used ? LOCKED_FIELDS : [],
 };
}

export async function getVoucher(request, response) {
 response.json({ success: true, data: await voucherDetail(await findVoucher(request.params.code)) });
}

/** The stored document's fields for validated form values. Zod has checked them, and empty optionals are simply absent. */
function storedFields({ startDate, endDate, maxDiscount, usageLimit, ...fields }) {
 return {
  ...fields,
  startAt: vietnamDayStart(startDate),
  endAt: vietnamDayEnd(endDate),
  ...(maxDiscount === null ? {} : { maxDiscount }),
  ...(usageLimit === null ? {} : { usageLimit }),
 };
}

export async function createVoucher(request, response) {
 const parsed = voucherFieldsSchema.safeParse(request.body);
 if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));

 let voucher;
 try {
  voucher = await Promotion.create({ ...storedFields(parsed.data), isActive: true, usedCount: 0 });
 } catch (error) {
  if (error?.code === 11000) return duplicate(response);
  throw error;
 }
 await recordAudit(request, {
  action: "voucher.create",
  target: { collectionName: "promotions", id: voucher._id },
  after: parsed.data,
  summary: `Tạo voucher ${voucher.code}`,
 });
 response.status(201).json({ success: true, data: await voucherDetail(voucher.toObject()) });
}

/** The fields that actually differ, in the form's terms. */
function changedFields(current, next) {
 const before = {};
 const after = {};
 for (const field of Object.keys(next)) {
  if (next[field] !== current[field]) {
   before[field] = current[field];
   after[field] = next[field];
  }
 }
 return { before, after };
}

/** `$set`/`$unset` for changed form fields. A date is only rewritten when its day changed, keeping an exact seeded time otherwise. */
function updateFor(after) {
 const $set = {};
 const $unset = {};
 for (const [field, value] of Object.entries(after)) {
  if (field === "startDate") $set.startAt = vietnamDayStart(value);
  else if (field === "endDate") $set.endAt = vietnamDayEnd(value);
  else if (value === null) $unset[field] = 1;
  else $set[field] = value;
 }
 return { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
}

/** Edits a voucher; the write is conditional on the `updatedAt` the form was loaded with. */
export async function updateVoucher(request, response) {
 const envelope = voucherPatchSchema.safeParse(request.body);
 if (!envelope.success) return sendFieldErrors(response, zodFieldErrors(envelope.error.issues));
 const { expectedUpdatedAt, ...input } = envelope.data;

 const voucher = await findVoucher(request.params.code);
 if (new Date(voucher.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) throw stale();

 const current = formFields(voucher);
 const parsed = voucherFieldsSchema.safeParse({ ...current, ...input });
 if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));

 const { before, after } = changedFields(current, parsed.data);
 if (Object.keys(after).length === 0) {
  return response.json({ success: true, data: { ...(await voucherDetail(voucher)), changed: false } });
 }

 const changedLocked = LOCKED_FIELDS.filter((field) => field in after);
 if (changedLocked.length > 0 && await isUsed(voucher)) {
  return sendFieldErrors(response, Object.fromEntries(changedLocked.map((field) => [field, LOCKED_MESSAGE])));
 }
 const used = voucherUsedCount(voucher);
 if ("usageLimit" in after && after.usageLimit !== null && after.usageLimit < used) {
  return sendFieldErrors(response, { usageLimit: `Giới hạn lượt dùng không được nhỏ hơn số lượt đã dùng (${used}).` });
 }

 // The conditions repeat the checks above, because an order can spend a use at any moment between them and the write.
 const filter = {
  _id: voucher._id,
  updatedAt: voucher.updatedAt,
  ...(changedLocked.length > 0 ? UNSPENT : {}),
  ...(after.usageLimit == null ? {} : { $expr: { $lte: [{ $ifNull: ["$usedCount", 0] }, after.usageLimit] } }),
 };
 let result;
 try {
  // Not `runValidators`: the model's value and date validators read sibling fields from `this`, which an update does
  // not provide. The merged values were validated above.
  result = await Promotion.updateOne(filter, updateFor(after));
 } catch (error) {
  if (error?.code === 11000) return duplicate(response);
  throw error;
 }
 if (result.matchedCount === 0) throw stale();

 await recordAudit(request, {
  action: "voucher.update",
  target: { collectionName: "promotions", id: voucher._id },
  before,
  after,
  summary: `Cập nhật voucher ${voucher.code}: ${Object.keys(after).map((field) => FIELD_LABELS[field]).join(", ")}`,
 });
 const updated = await Promotion.findById(voucher._id).lean();
 response.json({ success: true, data: { ...(await voucherDetail(updated)), changed: true } });
}

/** Both are conditional on the current value, so a repeat is refused rather than audited twice. */
async function setEnabled(request, response, enabled) {
 const voucher = await findVoucher(request.params.code);
 const filter = enabled ? { _id: voucher._id, isActive: false } : { _id: voucher._id, isActive: { $ne: false } };
 const updated = await Promotion.findOneAndUpdate(filter, { $set: { isActive: enabled } }, { returnDocument: "after" }).lean();
 if (!updated) {
  throw enabled
   ? new AppError("Voucher đang được bật.", 409, "VOUCHER_ALREADY_ENABLED")
   : new AppError("Voucher đang được tắt.", 409, "VOUCHER_ALREADY_DISABLED");
 }
 await recordAudit(request, {
  action: enabled ? "voucher.enable" : "voucher.disable",
  target: { collectionName: "promotions", id: voucher._id },
  before: { isActive: !enabled },
  after: { isActive: enabled },
  summary: `${enabled ? "Bật" : "Tắt"} voucher ${voucher.code}`,
 });
 response.json({ success: true, data: await voucherDetail(updated) });
}

export const enableVoucher = (request, response) => setEnabled(request, response, true);
export const disableVoucher = (request, response) => setEnabled(request, response, false);

/** Refused once used, so reports and orders keep a meaningful code. */
export async function deleteVoucher(request, response) {
 const voucher = await findVoucher(request.params.code);
 const inUse = () => new AppError(`Không thể xóa “${voucher.code}” vì đã có đơn hàng sử dụng. Bạn có thể tắt voucher này.`, 409, "VOUCHER_IN_USE");
 if (await isUsed(voucher)) throw inUse();

 // Conditional, because an order can reserve a use after the check above.
 const result = await Promotion.deleteOne({ _id: voucher._id, ...UNSPENT });
 if (result.deletedCount === 0) throw inUse();

 await recordAudit(request, {
  action: "voucher.delete",
  target: { collectionName: "promotions", id: voucher._id },
  before: formFields(voucher),
  summary: `Xóa voucher ${voucher.code}`,
 });
 response.json({ success: true, data: { code: voucher.code } });
}
