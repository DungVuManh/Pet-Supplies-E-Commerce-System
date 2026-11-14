import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { sendFieldErrors, zodFieldErrors } from "../../common/field-errors.js";
import { pageDto } from "../../common/pagination.js";
import { allowedImageUrl } from "../../common/product-images.js";
import { accentInsensitiveRegex, searchTokens } from "../../common/search.js";
import { AuditLog } from "../../models/audit-log.model.js";
import { Cart } from "../../models/cart.model.js";
import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import { StockMovement } from "../../models/stock-movement.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { productCreateSchema, productListQuerySchema, productPatchSchema } from "../../validators/admin/product.validator.js";
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

/** The category, or null when the reference matches nothing. */
function categoryScope(ref, index) {
  const category = [...index.values()].find((item) => item.ref.toLowerCase() === ref.toLowerCase());
  if (!category) return null;
  return new Set([category.id]);
}

/**
 * Every variant row, and the rows the tab, filters, and search keep. The list is
 * built in code, not in a pipeline, so the threshold and status rules exist once
 * and are shared with the detail screen and the export.
 */
async function filteredProductRows(query) {
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
  return { all: all.map(({ row }) => row), rows };
}

/** `counts` ignores the filters. */
export async function listProducts(request, response) {
  const query = parseQuery(productListQuerySchema, request.query);
  const { all, rows } = await filteredProductRows(query);
  const hidden = all.filter((row) => row.status === "hidden").length;
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

const signed = (value) => `${value > 0 ? "+" : ""}${value.toLocaleString("vi-VN")}`;

/** What the audit log and stock movements recorded for this product, newest first. */
async function productHistory(product) {
  const [entries, movements] = await Promise.all([
    AuditLog.find({ "target.collectionName": "products", "target.id": String(product._id) })
      .sort({ at: -1 }).limit(HISTORY_LIMIT).populate("actorId", "fullName").lean(),
    StockMovement.find({ productId: product._id })
      .sort({ at: -1 }).limit(HISTORY_LIMIT).populate("actorId", "fullName").lean(),
  ]);
  return [
    ...entries.map((entry) => ({
      id: String(entry._id),
      at: entry.at,
      title: entry.summary || entry.action,
      actorName: entry.actorId?.fullName ?? null,
    })),
    ...movements.map((movement) => ({
      id: String(movement._id),
      at: movement.at,
      title: `Điều chỉnh tồn kho ${movement.sku}: ${signed(movement.quantity)} (${movement.stockBefore} → ${movement.stockAfter})`,
      actorName: movement.actorId?.fullName ?? null,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, HISTORY_LIMIT);
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
    components: product.components ?? "",
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

const PRODUCT_LABELS = {
  name: "tên", brand: "thương hiệu", petType: "loài", description: "mô tả", unit: "đơn vị", isActive: "trạng thái", categoryIds: "danh mục",
  sku: "SKU", price: "giá bán", cost: "giá vốn", stock: "tồn kho", lowStockThreshold: "ngưỡng cảnh báo", images: "ảnh",
};
const PRODUCT_FIELDS = ["name", "brand", "petType", "description", "components", "unit", "isActive"];
const VARIANT_FIELDS = ["sku", "price", "cost", "stock", "lowStockThreshold"];

const sameCategories = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
// Order matters for images: the first one is the main photo.
const sameImages = (a, b) => a.length === b.length && a.every((url, index) => url === b[index]);

/** The images field error when a URL points somewhere a product may not store, or null. */
function imagesError(urls, current) {
  return urls.every((url) => allowedImageUrl(url, current)) ? null : { images: "Có ảnh không phải tải lên từ trang quản trị." };
}

/** Resolves category references to ids, or null if any of them is unknown. */
function resolveCategories(refs, index) {
  const byRef = new Map([...index.values()].map((category) => [category.ref.toLowerCase(), category.id]));
  const ids = [...new Set(refs.map((ref) => byRef.get(ref.toLowerCase())))];
  return ids.includes(undefined) ? null : ids;
}

/** Why a SKU cannot be renamed, or null. Orders and carts store the SKU, so renaming would orphan them. */
async function skuRenameBlocker(variant, newSku) {
  if (await Order.exists({ "items.variantSku": variant.sku })) return "Không thể đổi SKU vì đã có đơn hàng dùng SKU này.";
  if (await Cart.exists({ "items.variantSku": variant.sku })) return "Không thể đổi SKU vì đang có giỏ hàng chứa SKU này.";
  if (await Product.exists({ "variants.sku": newSku })) return "SKU đã tồn tại.";
  return null;
}

/** The fields that really differ, as `{ before, after }`. A null means "clear the value". */
function diffProduct(product, variant, input, categoryIds) {
  const before = {};
  const after = {};
  const compare = (field, current, next, equal = (a, b) => a === b) => {
    if (next !== undefined && !equal(current, next)) { before[field] = current; after[field] = next; }
  };
  for (const field of PRODUCT_FIELDS) {
    const current = field === "isActive" ? product.isActive !== false : product[field] ?? "";
    compare(field, current, input[field]);
  }
  for (const field of VARIANT_FIELDS) compare(field, variant[field] ?? null, input[field]);
  compare("categoryIds", productCategoryIds(product), categoryIds, sameCategories);
  compare("images", product.images ?? [], input.images, sameImages);
  return { before, after };
}

function productUpdate(after) {
  const $set = {};
  const $unset = {};
  for (const [field, value] of Object.entries(after)) {
    const path = VARIANT_FIELDS.includes(field) ? `variants.$.${field}` : field;
    if (value === null) $unset[path] = 1;
    else $set[path] = value;
  }
  return { ...(Object.keys($set).length && { $set }), ...(Object.keys($unset).length && { $unset }) };
}

/** A movement that fails to save is logged and never undoes the change it describes. */
async function recordMovement(request, product, variant, after, newSku) {
  try {
    await StockMovement.create({
      productId: product._id,
      sku: newSku,
      type: "adjust",
      quantity: after.stock - variant.stock,
      stockBefore: variant.stock,
      stockAfter: after.stock,
      reason: "Chỉnh sửa sản phẩm",
      source: { kind: "adjustment", id: String(product._id) },
      actorId: request.user._id,
    });
  } catch {
    console.error("[stock] Failed to record stock movement", { sku: newSku });
  }
}

/**
 * Edits product-level fields, which apply to all variants, and this SKU's own
 * fields. Stock is written only if it still equals `expectedStock` and stays at
 * or above reserved stock, so a sale made while the form was open is not lost.
 */
export async function updateProduct(request, response) {
  const parsed = productPatchSchema.safeParse(request.body);
  if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));
  const { categoryCodes, expectedStock, ...input } = parsed.data;

  const { product, variant } = await findProductBySku(request.params.sku);
  const index = await categoryIndex();
  const categoryIds = categoryCodes && resolveCategories(categoryCodes, index);
  if (categoryCodes && !categoryIds) return sendFieldErrors(response, { categoryCodes: "Có danh mục không tồn tại." });
  const badImages = input.images && imagesError(input.images, product.images ?? []);
  if (badImages) return sendFieldErrors(response, badImages);

  const { before, after } = diffProduct(product, variant, input, categoryIds ?? undefined);
  if (Object.keys(after).length === 0) {
    return response.json({ success: true, data: { ...(await productDetail(product, variant)), changed: false } });
  }

  const stale = () => new AppError("Tồn kho vừa thay đổi. Số liệu mới nhất đã được tải lại, hãy kiểm tra rồi lưu lại.", 409, "STALE_STOCK");
  const changesStock = after.stock !== undefined;
  if (changesStock) {
    if (expectedStock === undefined) return sendFieldErrors(response, { stock: "Thiếu tồn kho lúc tải biểu mẫu. Hãy tải lại trang." });
    if (expectedStock !== variant.stock) throw stale();
    if (after.stock < (variant.reservedStock ?? 0)) {
      return sendFieldErrors(response, { stock: `Tồn kho không thể thấp hơn số đang giữ cho đơn hàng (${variant.reservedStock}).` });
    }
  }
  if (after.sku) {
    const blocker = await skuRenameBlocker(variant, after.sku);
    if (blocker) return sendFieldErrors(response, { sku: blocker }, { status: 409, code: blocker === "SKU đã tồn tại." ? "DUPLICATE_VALUE" : "SKU_IN_USE", message: blocker });
  }

  const variantMatch = { sku: variant.sku, ...(changesStock && { stock: expectedStock, reservedStock: { $not: { $gt: after.stock } } }) };
  let result;
  try {
    result = await Product.updateOne({ _id: product._id, variants: { $elemMatch: variantMatch } }, productUpdate(after), { runValidators: true });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return sendFieldErrors(response, { sku: "SKU đã tồn tại." }, { status: 409, code: "DUPLICATE_VALUE", message: "SKU đã tồn tại." });
  }
  if (result.matchedCount === 0) throw stale();

  const newSku = after.sku ?? variant.sku;
  if (changesStock) await recordMovement(request, product, variant, after, newSku);
  await recordAudit(request, {
    action: "product.update",
    target: { collectionName: "products", id: product._id },
    before,
    after,
    summary: `Cập nhật sản phẩm ${newSku}: ${Object.keys(after).map((field) => PRODUCT_LABELS[field]).join(", ")}`,
  });
  const updated = await findProductBySku(newSku);
  response.json({ success: true, data: { ...(await productDetail(updated.product, updated.variant)), changed: true } });
}

/** Deletes the whole product, with all of its variants, unless an order references it (CR-10). */
export async function deleteProduct(request, response) {
  const { product, variant } = await findProductBySku(request.params.sku);
  if (await Order.exists({ "items.productId": product._id })) {
    throw new AppError("Không thể xóa sản phẩm đã có đơn hàng. Hãy ẩn sản phẩm để ngừng bán.", 409, "PRODUCT_HAS_ORDERS");
  }
  await Product.deleteOne({ _id: product._id });
  await recordAudit(request, {
    action: "product.delete",
    target: { collectionName: "products", id: product._id },
    before: { name: product.name, brand: product.brand, skus: product.variants.map((item) => item.sku), isActive: product.isActive },
    summary: `Xóa sản phẩm ${variant.sku} · ${product.name}`,
  });
  response.json({ success: true, data: { sku: variant.sku } });
}

const STARTING_STOCK_REASON = "Tồn kho ban đầu";
const skuTaken = "SKU đã tồn tại.";

const skuConflict = (response, indexes) => sendFieldErrors(
  response,
  Object.fromEntries(indexes.map((index) => [`variants.${index}.sku`, skuTaken])),
  { status: 409, code: "DUPLICATE_VALUE", message: skuTaken },
);

/** A variant as stored: cost and threshold are left out when empty, so the global threshold applies. */
function storedVariant({ label, sku, price, cost, stock, lowStockThreshold }) {
  return {
    label, sku, price, stock, reservedStock: 0,
    ...(cost != null && { cost }),
    ...(lowStockThreshold != null && { lowStockThreshold }),
  };
}

/** Starting stock is recorded like any other adjustment. A failure is logged and never undoes the product. */
async function recordStartingStock(request, product) {
  const movements = product.variants.filter((variant) => variant.stock > 0).map((variant) => ({
    productId: product._id,
    sku: variant.sku,
    type: "adjust",
    quantity: variant.stock,
    stockBefore: 0,
    stockAfter: variant.stock,
    reason: STARTING_STOCK_REASON,
    source: { kind: "adjustment", id: String(product._id) },
    actorId: request.user._id,
  }));
  if (movements.length === 0) return;
  try {
    await StockMovement.insertMany(movements);
  } catch {
    console.error("[stock] Failed to record starting stock", { productId: String(product._id) });
  }
}

/**
 * Creates a product with its variants and the photos already uploaded. SKUs are unique across all
 * products: the check names the clashing rows, and the unique index catches a race.
 */
export async function createProduct(request, response) {
  const parsed = productCreateSchema.safeParse(request.body);
  if (!parsed.success) return sendFieldErrors(response, zodFieldErrors(parsed.error.issues));
  const { categoryCodes, variants, ...input } = parsed.data;

  const categoryIds = resolveCategories(categoryCodes, await categoryIndex());
  if (!categoryIds) return sendFieldErrors(response, { categoryCodes: "Có danh mục không tồn tại." });
  const badImages = imagesError(input.images, []);
  if (badImages) return sendFieldErrors(response, badImages);

  const skus = variants.map((variant) => variant.sku);
  const existing = await Product.find({ "variants.sku": { $in: skus } }).select("variants.sku").lean();
  const taken = new Set(existing.flatMap((product) => product.variants.map((variant) => variant.sku)));
  const clashes = skus.flatMap((sku, index) => (taken.has(sku) ? [index] : []));
  if (clashes.length) return skuConflict(response, clashes);

  let product;
  try {
    product = (await Product.create({ ...input, categoryIds, variants: variants.map(storedVariant) })).toObject();
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const sku = error.keyValue?.["variants.sku"];
    const index = skus.indexOf(sku);
    return skuConflict(response, [index >= 0 ? index : 0]);
  }

  await recordStartingStock(request, product);
  await recordAudit(request, {
    action: "product.create",
    target: { collectionName: "products", id: product._id },
    after: { ...input, categoryIds: categoryIds.map(String), variants: variants.map(({ label, sku, price, stock }) => ({ label, sku, price, stock })) },
    summary: `Tạo sản phẩm ${skus.join(", ")} · ${product.name}`,
  });
  response.status(201).json({ success: true, data: await productDetail(product, product.variants[0]) });
}

export const EXPORT_LIMIT = 5000;

/**
 * Every row the list would show for these filters, across all pages, up to
 * `EXPORT_LIMIT`. The browser writes the file. Rows never include cost.
 */
export async function exportProducts(request, response) {
  const query = parseQuery(productListQuerySchema, request.query);
  const { rows } = await filteredProductRows(query);
  const truncated = rows.length > EXPORT_LIMIT;
  await recordAudit(request, {
    action: "product.export",
    target: { collectionName: "products", id: "export" },
    after: { tab: query.tab, category: query.category, status: query.status, q: query.q, rows: Math.min(rows.length, EXPORT_LIMIT) },
    summary: `Xuất danh sách sản phẩm: ${Math.min(rows.length, EXPORT_LIMIT)} dòng`,
  });
  response.json({ success: true, data: { items: rows.slice(0, EXPORT_LIMIT), total: rows.length, truncated } });
}
