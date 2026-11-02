import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { sendFieldErrors, zodFieldErrors } from "../../common/field-errors.js";
import { accentInsensitiveRegex, searchTokens } from "../../common/search.js";
import { Category } from "../../models/category.model.js";
import { Product } from "../../models/product.model.js";
import { categoryListQuerySchema, categoryPatchSchema } from "../../validators/admin/category.validator.js";
import { parseQuery } from "../../validators/admin/list-query.js";

/** Addresses a category in URLs; a category the migration has not reached falls back to its id. */
const categoryRef = (category) => category.code ?? String(category._id);

const byDisplayOrder = (a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) || a.name.localeCompare(b.name, "vi");

/** Products written before `categoryIds` existed hold a single `categoryId`. */
const productCategoryIds = (product) => (product.categoryIds?.length ? product.categoryIds : [product.categoryId]).filter(Boolean).map(String);

/** A product filter for "linked to this category", in both the current and the older shape. */
const linkedTo = (id) => ({ $or: [{ categoryIds: id }, { categoryId: id }] });

/** Each root followed by its children. A child whose parent is gone is shown as a root. */
function treeOrder(categories) {
 const ids = new Set(categories.map((category) => String(category._id)));
 const parentOf = (category) => (category.parentId && ids.has(String(category.parentId)) ? String(category.parentId) : null);
 const roots = categories.filter((category) => !parentOf(category)).sort(byDisplayOrder);
 return roots.flatMap((root) => [
  root,
  ...categories.filter((category) => parentOf(category) === String(root._id)).sort(byDisplayOrder),
 ]);
}

/**
 * Products per category, computed and never stored. A parent counts its own and
 * its children's products, and a product in several of them still counts once.
 */
async function productCounts(categories) {
 const products = await Product.find().select("categoryIds categoryId").lean();
 const parents = new Map(categories.map((category) => [String(category._id), category.parentId ? String(category.parentId) : null]));
 const counts = new Map();
 for (const product of products) {
  const scope = new Set();
  for (const id of productCategoryIds(product)) {
   scope.add(id);
   if (parents.get(id)) scope.add(parents.get(id));
  }
  for (const id of scope) counts.set(id, (counts.get(id) ?? 0) + 1);
 }
 return counts;
}

function matches(category, tokens, status) {
 if (status !== "all" && (category.isActive === false ? "hidden" : "active") !== status) return false;
 const text = `${category.name} ${category.code ?? ""}`;
 return tokens.every((token) => accentInsensitiveRegex(token).test(text));
}

/** The whole tree, unpaged. A matching child keeps its parent, flagged `context`, so the hierarchy stays readable. */
export async function listCategories(request, response) {
 const query = parseQuery(categoryListQuerySchema, request.query);
 const tokens = searchTokens(query.q);
 const categories = await Category.find().lean();
 const counts = await productCounts(categories);
 const byId = new Map(categories.map((category) => [String(category._id), category]));

 const matched = new Set(categories.filter((category) => matches(category, tokens, query.status)).map((category) => String(category._id)));
 const shown = new Set(matched);
 for (const id of matched) {
  const parentId = byId.get(id).parentId;
  if (parentId && byId.has(String(parentId))) shown.add(String(parentId));
 }

 const items = treeOrder(categories).filter((category) => shown.has(String(category._id))).map((category) => {
  const parent = category.parentId ? byId.get(String(category.parentId)) : null;
  return {
   id: String(category._id),
   ref: categoryRef(category),
   code: category.code ?? null,
   name: category.name,
   parentCode: parent?.code ?? null,
   isChild: Boolean(parent),
   status: category.isActive === false ? "hidden" : "active",
   productCount: counts.get(String(category._id)) ?? 0,
   context: !matched.has(String(category._id)),
  };
 });
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
 const children = await Category.countDocuments({ parentId: category._id });
 if (children > 0) return `còn ${children} danh mục con`;
 const products = await Product.countDocuments(linkedTo(category._id));
 return products > 0 ? `còn ${products} sản phẩm liên kết` : null;
}

async function categoryDetail(category) {
 const categories = await Category.find().lean();
 const [counts, blocker] = await Promise.all([productCounts(categories), deleteBlocker(category)]);
 const parent = category.parentId ? categories.find((item) => String(item._id) === String(category.parentId)) : null;
 const hasChildren = categories.some((item) => String(item.parentId) === String(category._id));
 const options = categories
  .filter((item) => !item.parentId && String(item._id) !== String(category._id))
  .sort(byDisplayOrder)
  .map((item) => ({ ref: categoryRef(item), name: item.name }));
 return {
  id: String(category._id),
  ref: categoryRef(category),
  code: category.code ?? null,
  name: category.name,
  slug: category.slug,
  parentCode: parent ? categoryRef(parent) : null,
  parentName: parent?.name ?? null,
  description: category.description ?? "",
  displayOrder: category.displayOrder ?? null,
  status: category.isActive === false ? "hidden" : "active",
  updatedAt: category.updatedAt,
  productCount: counts.get(String(category._id)) ?? 0,
  hasChildren,
  blocker,
  parentOptions: options,
 };
}

export async function getCategory(request, response) {
 const category = await findCategory(request.params.code);
 response.json({ success: true, data: await categoryDetail(category) });
}

const CATEGORY_LABELS = { name: "tên", slug: "đường dẫn", parentId: "danh mục cha", description: "mô tả", displayOrder: "thứ tự", isActive: "trạng thái" };

const currentCategoryValue = (category, field) => {
 if (field === "parentId") return category.parentId ? String(category.parentId) : null;
 if (field === "description") return category.description ?? "";
 if (field === "isActive") return category.isActive !== false;
 return category[field];
};

/** The parent's id, or a field error: at most 2 levels, so the parent is a root and this category has no children. */
async function resolveParent(category, ref) {
 if (ref === null) return { parentId: null };
 if (await Category.exists({ parentId: category._id })) return { error: "Danh mục đang có danh mục con nên phải là danh mục gốc." };
 const parent = await findCategory(ref).catch(() => null);
 if (!parent) return { error: "Không tìm thấy danh mục cha." };
 if (String(parent._id) === String(category._id)) return { error: "Danh mục không thể là cha của chính nó." };
 if (parent.parentId) return { error: "Danh mục cha phải là danh mục gốc." };
 return { parentId: String(parent._id) };
}

function duplicateFields(fields) {
 return { status: 409, code: "DUPLICATE_VALUE", message: "Dữ liệu đã tồn tại.", fields };
}

/** Name and slug are unique. The unique indexes catch a race the check misses. */
async function findDuplicate(category, after) {
 const fields = {};
 for (const [field, message] of [["name", "Tên danh mục đã tồn tại."], ["slug", "Đường dẫn đã tồn tại."]]) {
  if (after[field] && await Category.exists({ [field]: after[field], _id: { $ne: category._id } })) fields[field] = message;
 }
 return Object.keys(fields).length ? duplicateFields(fields) : null;
}

/** Edits a category; the write is conditional on the `updatedAt` the form was loaded with. */
export async function updateCategory(request, response) {
 const parsed = categoryPatchSchema.safeParse(request.body);
 if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));
 const { expectedUpdatedAt, parentCode, ...input } = parsed.data;

 const category = await findCategory(request.params.code);
 const stale = () => new AppError("Danh mục vừa được thay đổi ở nơi khác. Dữ liệu mới nhất đã được tải lại.", 409, "STALE_CATEGORY");
 if (new Date(category.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) throw stale();

 const requested = { ...input };
 if (parentCode !== undefined) {
  const { parentId, error } = await resolveParent(category, parentCode);
  if (error) return sendFieldErrors(response, { parentCode: error });
  requested.parentId = parentId;
 }

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

 const duplicate = await findDuplicate(category, after);
 if (duplicate) return sendFieldErrors(response, duplicate.fields, duplicate);

 let result;
 try {
  result = await Category.updateOne({ _id: category._id, updatedAt: category.updatedAt }, { $set: after }, { runValidators: true });
 } catch (error) {
  if (error?.code !== 11000) throw error;
  const field = error.keyPattern?.slug ? "slug" : "name";
  const { fields, ...options } = duplicateFields({ [field]: field === "slug" ? "Đường dẫn đã tồn tại." : "Tên danh mục đã tồn tại." });
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

/** Refused while child categories or products are linked. */
export async function deleteCategory(request, response) {
 const category = await findCategory(request.params.code);
 const blocker = await deleteBlocker(category);
 if (blocker) throw new AppError(`Không thể xóa “${category.name}”: ${blocker}.`, 409, "CATEGORY_IN_USE");

 await Category.deleteOne({ _id: category._id });
 await recordAudit(request, {
  action: "category.delete",
  target: { collectionName: "categories", id: category._id },
  before: { code: category.code, name: category.name, slug: category.slug, parentId: category.parentId ?? null, isActive: category.isActive },
  summary: `Xóa danh mục ${category.code ?? ""} ${category.name}`.replace(/\s+/g, " "),
 });
 response.json({ success: true, data: { id: String(category._id) } });
}
