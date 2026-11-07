import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { sendFieldErrors, zodFieldErrors } from "../../common/field-errors.js";
import { accentInsensitiveRegex, searchTokens } from "../../common/search.js";
import { Category } from "../../models/category.model.js";
import { Product } from "../../models/product.model.js";
import { categoryCreateSchema, categoryListQuerySchema, categoryPatchSchema } from "../../validators/admin/category.validator.js";
import { parseQuery } from "../../validators/admin/list-query.js";

/** Addresses a category in URLs; a category the migration has not reached falls back to its id. */
const categoryRef = (category) => category.code ?? String(category._id);

const byDisplayOrder = (a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) || a.name.localeCompare(b.name, "vi");

/** Products written before `categoryIds` existed hold a single `categoryId`. */
const productCategoryIds = (product) => (product.categoryIds?.length ? product.categoryIds : [product.categoryId]).filter(Boolean).map(String);

/** A product filter for "linked to this category", in both the current and the older shape. */
const linkedTo = (id) => ({ $or: [{ categoryIds: id }, { categoryId: id }] });

function treeOrder(categories) {
 return [...categories].sort(byDisplayOrder);
}

/**
 * Products per category, computed and never stored.
 */
async function productCounts(categories) {
 const products = await Product.find().select("categoryIds categoryId").lean();
 const counts = new Map();
 for (const product of products) {
  const scope = new Set(productCategoryIds(product));
  for (const id of scope) counts.set(id, (counts.get(id) ?? 0) + 1);
 }
 return counts;
}

function matches(category, tokens, status) {
 if (status !== "all" && (category.isActive === false ? "hidden" : "active") !== status) return false;
 const text = `${category.name} ${category.code ?? ""}`;
 return tokens.every((token) => accentInsensitiveRegex(token).test(text));
}

/** The categories, unpaged, in display order. */
export async function listCategories(request, response) {
 const query = parseQuery(categoryListQuerySchema, request.query);
 const tokens = searchTokens(query.q);
 const categories = await Category.find().lean();
 const counts = await productCounts(categories);

 const filtered = categories.filter((category) => matches(category, tokens, query.status));
 const items = treeOrder(filtered).map((category) => ({
  id: String(category._id),
  ref: categoryRef(category),
  code: category.code ?? null,
  name: category.name,
  status: category.isActive === false ? "hidden" : "active",
  productCount: counts.get(String(category._id)) ?? 0,
 }));
 response.json({
  success: true,
  data: {
   items,
   pagination: { page: 1, pageSize: items.length, total: items.length, totalPages: items.length ? 1 : 0 },
   counts: { all: categories.length },
  },
 });
}

async function findCategory(ref) {
 let filter = null;
 if (/^DM\d{3,}$/i.test(ref)) filter = { code: ref.toUpperCase() };
 else if (/^[0-9a-f]{24}$/i.test(ref)) filter = { _id: ref };
 const category = filter ? await Category.findOne(filter).lean() : null;
 if (!category) throw new AppError("Không tìm thấy danh mục.", 404, "NOT_FOUND");
 return category;
}

/** Why a category cannot be deleted, or null. Products are not moved for the Admin. */
async function deleteBlocker(category) {
 const products = await Product.countDocuments(linkedTo(category._id));
 return products > 0 ? `còn ${products} sản phẩm liên kết` : null;
}

async function categoryDetail(category) {
 const categories = await Category.find().lean();
 const [counts, blocker] = await Promise.all([productCounts(categories), deleteBlocker(category)]);
 return {
  id: String(category._id),
  ref: categoryRef(category),
  code: category.code ?? null,
  name: category.name,
  slug: category.slug,
  petType: category.petType ?? "both",
  description: category.description ?? "",
  displayOrder: category.displayOrder ?? null,
  status: category.isActive === false ? "hidden" : "active",
  updatedAt: category.updatedAt,
  productCount: counts.get(String(category._id)) ?? 0,
  blocker,
 };
}

export async function getCategory(request, response) {
 const category = await findCategory(request.params.code);
 response.json({ success: true, data: await categoryDetail(category) });
}

const CATEGORY_LABELS = { name: "tên", slug: "đường dẫn", petType: "loài", description: "mô tả", displayOrder: "thứ tự", isActive: "trạng thái" };

const currentCategoryValue = (category, field) => {
 if (field === "petType") return category.petType ?? "both";
 if (field === "description") return category.description ?? "";
 if (field === "isActive") return category.isActive !== false;
 return category[field];
};

function duplicateFields(fields) {
 return { status: 409, code: "DUPLICATE_VALUE", message: "Dữ liệu đã tồn tại.", fields };
}

const DUPLICATE_MESSAGES = { name: "Tên danh mục đã tồn tại.", slug: "Đường dẫn đã tồn tại." };

/**
 * Name and slug are unique. The unique indexes catch a race the check misses.
 * `excludeId` is the category being edited, or null for a new one.
 */
async function findDuplicate(excludeId, values) {
 const fields = {};
 for (const [field, message] of Object.entries(DUPLICATE_MESSAGES)) {
  const filter = { [field]: values[field], ...(excludeId && { _id: { $ne: excludeId } }) };
  if (values[field] && await Category.exists(filter)) fields[field] = message;
 }
 return Object.keys(fields).length ? duplicateFields(fields) : null;
}

/** A duplicate-key error on name or slug as a field error; null for anything else, such as the code. */
function duplicateKeyFields(error) {
 const field = ["slug", "name"].find((key) => error.keyPattern?.[key]);
 if (!field) return null;
 return duplicateFields({ [field]: DUPLICATE_MESSAGES[field] });
}

/** Edits a category; the write is conditional on the `updatedAt` the form was loaded with. */
export async function updateCategory(request, response) {
 const parsed = categoryPatchSchema.safeParse(request.body);
 if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));
 const { expectedUpdatedAt, ...input } = parsed.data;

 const category = await findCategory(request.params.code);
 const stale = () => new AppError("Danh mục vừa được thay đổi ở nơi khác. Dữ liệu mới nhất đã được tải lại.", 409, "STALE_CATEGORY");
 if (new Date(category.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) throw stale();

 const requested = { ...input };

 const before = {};
 const after = {};
 for (const [field, value] of Object.entries(requested)) {
  if (value !== currentCategoryValue(category, field)) {
   before[field] = currentCategoryValue(category, field);
   after[field] = value;
  }
 }
 if (Object.keys(after).length === 0) {
  return response.json({ success: true, data: { ...(await categoryDetail(category)), changed: false } });
 }

 const duplicate = await findDuplicate(category._id, after);
 if (duplicate) return sendFieldErrors(response, duplicate.fields, duplicate);

 let result;
 try {
  result = await Category.updateOne({ _id: category._id, updatedAt: category.updatedAt }, { $set: after }, { runValidators: true });
 } catch (error) {
  if (error?.code !== 11000) throw error;
  const { fields, ...options } = duplicateKeyFields(error) ?? duplicateFields({ name: DUPLICATE_MESSAGES.name });
  return sendFieldErrors(response, fields, options);
 }
 if (result.matchedCount === 0) throw stale();

 await recordAudit(request, {
  action: "category.update",
  target: { collectionName: "categories", id: category._id },
  before,
  after,
  summary: `Cập nhật danh mục ${category.code ?? category.name}: ${Object.keys(after).map((field) => CATEGORY_LABELS[field]).join(", ")}`,
 });
 const updated = await Category.findById(category._id).lean();
 response.json({ success: true, data: { ...(await categoryDetail(updated)), changed: true } });
}

const CODE_ATTEMPTS = 3;

/** The next `DM###` after the highest code in use, the same rule as the migration. */
async function nextCategoryCode() {
 const categories = await Category.find({ code: { $exists: true } }).select("code").lean();
 const highest = Math.max(0, ...categories.map((category) => Number(category.code?.slice(2)) || 0));
 return `DM${String(highest + 1).padStart(3, "0")}`;
}

/** After the last category, so a new one does not jump ahead of existing ones. */
async function nextDisplayOrder() {
 const [last] = await Category.find({ displayOrder: { $exists: true } }).sort({ displayOrder: -1 }).limit(1).select("displayOrder").lean();
 return (last?.displayOrder ?? 0) + 1;
}

/**
 * Creates a category with the next free code. Two Admins creating at once can
 * pick the same code; the unique index refuses the second, which then retries.
 */
export async function createCategory(request, response) {
 const parsed = categoryCreateSchema.safeParse(request.body);
 if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));
 const input = parsed.data;

 const duplicate = await findDuplicate(null, input);
 if (duplicate) return sendFieldErrors(response, duplicate.fields, duplicate);

 const values = { ...input, displayOrder: input.displayOrder ?? await nextDisplayOrder() };
 let created = null;
 for (let attempt = 1; !created; attempt += 1) {
  try {
   created = (await Category.create({ ...values, code: await nextCategoryCode() })).toObject();
  } catch (error) {
   if (error?.code !== 11000) throw error;
   const clash = duplicateKeyFields(error);
   if (clash) return sendFieldErrors(response, clash.fields, clash);
   if (attempt >= CODE_ATTEMPTS) throw new AppError("Chưa thể cấp mã danh mục. Vui lòng thử lại.", 409, "CODE_CONFLICT");
  }
 }

 await recordAudit(request, {
  action: "category.create",
  target: { collectionName: "categories", id: created._id },
  after: { code: created.code, ...values },
  summary: `Tạo danh mục ${created.code} ${created.name}`,
 });
 response.status(201).json({ success: true, data: await categoryDetail(created) });
}

/** Refused while products are linked. */
export async function deleteCategory(request, response) {
 const category = await findCategory(request.params.code);
 const blocker = await deleteBlocker(category);
 if (blocker) throw new AppError(`Không thể xóa “${category.name}”: ${blocker}.`, 409, "CATEGORY_IN_USE");

 await Category.deleteOne({ _id: category._id });
 await recordAudit(request, {
  action: "category.delete",
  target: { collectionName: "categories", id: category._id },
  before: { code: category.code, name: category.name, slug: category.slug, isActive: category.isActive },
  summary: `Xóa danh mục ${category.code ?? ""} ${category.name}`.replace(/\s+/g, " "),
 });
 response.json({ success: true, data: { id: String(category._id) } });
}
