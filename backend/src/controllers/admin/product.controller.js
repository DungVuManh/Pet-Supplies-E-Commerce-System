import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { pageDto } from "../../common/pagination.js";
import { accentInsensitiveRegex, searchTokens } from "../../common/search.js";
import { AuditLog } from "../../models/audit-log.model.js";
import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { productListQuerySchema } from "../../validators/admin/product.validator.js";
import {
 availableStock, categoryIndex, globalLowStockThreshold, productCategories, productCategoryIds, productCode, variantStatus,
} from "./product.helpers.js";

/** One row per variant: the SKU is what the Admin screens address. */
function variantRows(product, threshold, index) {
 return (product.variants ?? []).map((variant) => ({
  sku: variant.sku,
  code: productCode(product),
  name: product.name,
  brand: product.brand ?? "",
  unit: product.unit ?? "",
  price: variant.price,
  available: availableStock(variant),
  threshold: variant.lowStockThreshold ?? threshold,
  status: variantStatus(product, variant, threshold),
  categories: productCategories(product, index),
 }));
}

/** The category and its children, or null when the reference matches nothing. */
function categoryScope(ref, index) {
 const category = [...index.values()].find((item) => item.ref.toLowerCase() === ref.toLowerCase());
 if (!category) return null;
 return new Set([category.id, ...[...index.values()].filter((item) => item.parentId === category.id).map((item) => item.id)]);
}

/**
 * The list is built in code, not in a pipeline, so the threshold and status rules
 * exist once and are shared with the detail screen. `counts` ignores the filters.
 */
export async function listProducts(request, response) {
 const query = parseQuery(productListQuerySchema, request.query);
 const [products, threshold, index] = await Promise.all([
  Product.find().select("name brand unit isActive categoryIds categoryId variants createdAt").sort({ createdAt: -1, _id: -1 }).lean(),
  globalLowStockThreshold(),
  categoryIndex(),
 ]);

 const scope = query.category === "all" ? null : categoryScope(query.category, index);
 const tokens = searchTokens(query.q).map(accentInsensitiveRegex);
 const inScope = (product) => query.category === "all" || (scope && productCategoryIds(product).some((id) => scope.has(id)));
 const inTab = (row) => query.tab === "all" || (query.tab === "hidden") === (row.status === "hidden");
 const hasStatus = (row) => query.status === "all" || row.status === query.status;
 const matchesText = (row) => tokens.every((token) => token.test(`${row.sku} ${row.code} ${row.name} ${row.brand}`));

 const all = products.flatMap((product) => variantRows(product, threshold, index).map((row) => ({ row, product })));
 const rows = all
  .filter(({ row, product }) => inScope(product) && inTab(row) && hasStatus(row) && matchesText(row))
  .map(({ row }) => row);
 const hidden = all.filter(({ row }) => row.status === "hidden").length;
 const start = (query.page - 1) * query.pageSize;

 response.json({
  success: true,
  data: {
   ...pageDto(rows.slice(start, start + query.pageSize), rows.length, query),
   counts: { all: all.length, active: all.length - hidden, hidden },
  },
 });
}

const HISTORY_LIMIT = 20;

async function findProductBySku(sku) {
 const product = await Product.findOne({ "variants.sku": sku }).select("+variants.cost").lean();
 if (!product) throw new AppError("Không tìm thấy sản phẩm.", 404, "NOT_FOUND");
 return { product, variant: product.variants.find((item) => item.sku === sku) };
}

/** What the audit log recorded for this product, newest first. */
async function productHistory(product) {
 const entries = await AuditLog.find({ "target.collectionName": "products", "target.id": String(product._id) })
  .sort({ at: -1 }).limit(HISTORY_LIMIT).populate("actorId", "fullName").lean();
 return entries.map((entry) => ({
  id: String(entry._id),
  at: entry.at,
  title: entry.summary || entry.action,
  actorName: entry.actorId?.fullName ?? null,
 }));
}

async function productDetail(product, variant) {
 const [threshold, index, hasOrders, history] = await Promise.all([
  globalLowStockThreshold(),
  categoryIndex(),
  Order.exists({ "items.productId": product._id }),
  productHistory(product),
 ]);
 return {
  sku: variant.sku,
  code: productCode(product),
  label: variant.label,
  name: product.name,
  brand: product.brand ?? "",
  unit: product.unit ?? "",
  petType: product.petType,
  description: product.description ?? "",
  images: product.images ?? [],
  categories: productCategories(product, index),
  price: variant.price,
  cost: variant.cost ?? null,
  stock: variant.stock,
  reservedStock: variant.reservedStock ?? 0,
  available: availableStock(variant),
  threshold: variant.lowStockThreshold ?? threshold,
  ownThreshold: variant.lowStockThreshold ?? null,
  status: variantStatus(product, variant, threshold),
  isActive: product.isActive !== false,
  hasOrders: Boolean(hasOrders),
  updatedAt: product.updatedAt,
  lastUpdate: history[0] ? { at: history[0].at, actorName: history[0].actorName } : null,
  history,
 };
}

export async function getProduct(request, response) {
 const { product, variant } = await findProductBySku(request.params.sku);
 response.json({ success: true, data: await productDetail(product, variant) });
}

/**
 * Visibility belongs to the product, so it applies to all of its variants. The
 * update is conditional on the current value, so a repeat changes nothing.
 */
async function setVisibility(request, response, { isActive, action, summary, conflict }) {
 const { product, variant } = await findProductBySku(request.params.sku);
 const matchesCurrent = isActive ? { isActive: false } : { isActive: { $ne: false } };
 const result = await Product.updateOne({ _id: product._id, ...matchesCurrent }, { $set: { isActive } });
 if (result.matchedCount === 0) throw conflict();
 await recordAudit(request, {
  action,
  target: { collectionName: "products", id: product._id },
  before: { isActive: !isActive },
  after: { isActive },
  summary: `${summary} ${variant.sku} · ${product.name}`,
 });
 const threshold = await globalLowStockThreshold();
 response.json({
  success: true,
  data: { sku: variant.sku, isActive, status: variantStatus({ ...product, isActive }, variant, threshold) },
 });
}

export function hideProduct(request, response) {
 return setVisibility(request, response, {
  isActive: false, action: "product.hide", summary: "Ẩn sản phẩm",
  conflict: () => new AppError("Sản phẩm này đã được ẩn trước đó.", 409, "ALREADY_HIDDEN"),
 });
}

export function showProduct(request, response) {
 return setVisibility(request, response, {
  isActive: true, action: "product.show", summary: "Hiện sản phẩm",
  conflict: () => new AppError("Sản phẩm này đang hiển thị.", 409, "ALREADY_VISIBLE"),
 });
}
