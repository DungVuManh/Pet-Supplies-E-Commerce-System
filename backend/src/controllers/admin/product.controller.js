import { pageDto } from "../../common/pagination.js";
import { accentInsensitiveRegex, searchTokens } from "../../common/search.js";
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
