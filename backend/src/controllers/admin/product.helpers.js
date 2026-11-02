import { Category } from "../../models/category.model.js";
import { Setting } from "../../models/setting.model.js";

/** The global threshold; a variant's own `lowStockThreshold` takes priority. */
export async function globalLowStockThreshold() {
 const setting = await Setting.findById("global").select("lowStockThreshold").lean();
 return setting?.lowStockThreshold ?? Setting.schema.path("lowStockThreshold").defaultValue;
}

/** Products written before `categoryIds` existed hold a single `categoryId`. */
export const productCategoryIds = (product) => (product.categoryIds?.length ? product.categoryIds : [product.categoryId]).filter(Boolean).map(String);

export const availableStock = (variant) => variant.stock - (variant.reservedStock ?? 0);

/** Hidden wins; otherwise a variant at or below its threshold is low (UC30). */
export function variantStatus(product, variant, threshold) {
 if (product.isActive === false) return "hidden";
 return availableStock(variant) <= (variant.lowStockThreshold ?? threshold) ? "low" : "active";
}

/** Every category by id, with its reference and "Parent / Child" path. */
export async function categoryIndex() {
 const categories = await Category.find().select("name code parentId").lean();
 const byId = new Map(categories.map((category) => [String(category._id), category]));
 return new Map(categories.map((category) => {
  const parent = category.parentId ? byId.get(String(category.parentId)) : null;
  return [String(category._id), {
   id: String(category._id),
   ref: category.code ?? String(category._id),
   name: category.name,
   path: parent ? `${parent.name} / ${category.name}` : category.name,
   parentId: parent ? String(parent._id) : null,
  }];
 }));
}

export function productCategories(product, index) {
 return productCategoryIds(product).map((id) => index.get(id)).filter(Boolean)
  .map(({ ref, name, path }) => ({ ref, name, path }));
}

/** Display code, derived and never stored, like the user account code. */
export const productCode = (product) => `SP${String(product._id).slice(-6).toUpperCase()}`;
