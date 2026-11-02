import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { accentInsensitiveRegex, searchTokens } from "../../common/search.js";
import { Category } from "../../models/category.model.js";
import { Product } from "../../models/product.model.js";
import { categoryListQuerySchema } from "../../validators/admin/category.validator.js";
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

/** Refused while child categories or products are linked; products are not moved for the Admin. */
export async function deleteCategory(request, response) {
 const category = await findCategory(request.params.code);
 const inUse = (reason) => new AppError(`Không thể xóa “${category.name}”: ${reason}.`, 409, "CATEGORY_IN_USE");

 const children = await Category.countDocuments({ parentId: category._id });
 if (children > 0) throw inUse(`còn ${children} danh mục con`);
 const products = await Product.countDocuments(linkedTo(category._id));
 if (products > 0) throw inUse(`còn ${products} sản phẩm liên kết`);

 await Category.deleteOne({ _id: category._id });
 await recordAudit(request, {
  action: "category.delete",
  target: { collectionName: "categories", id: category._id },
  before: { code: category.code, name: category.name, slug: category.slug, parentId: category.parentId ?? null, isActive: category.isActive },
  summary: `Xóa danh mục ${category.code ?? ""} ${category.name}`.replace(/\s+/g, " "),
 });
 response.json({ success: true, data: { id: String(category._id) } });
}
