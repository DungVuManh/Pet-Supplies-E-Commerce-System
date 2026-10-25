import { matchesQuery, slugify } from "./text.ts";

/** Product category tree from the categories design (DM001–DM009); products reference these codes. */
export type CategoryStatus = "Hiển thị" | "Đã ẩn";
export type Category = {
  code: string; name: string; parent: string | null; pet: "Chó" | "Mèo" | null;
  slug: string; description: string; order: number; status: CategoryStatus; updatedAt: string;
};

type Seed = Pick<Category, "code" | "name" | "parent" | "pet" | "order" | "description"> & Partial<Pick<Category, "updatedAt">>;

const seeds: Seed[] = [
  { code: "DM001", name: "Chó", parent: null, pet: "Chó", order: 1, description: "Sản phẩm dành cho chó: thức ăn, đồ chơi và phụ kiện." },
  { code: "DM002", name: "Thức ăn cho chó", parent: "DM001", pet: "Chó", order: 1, updatedAt: "10/10/2026", description: "Thức ăn hạt, pate và bánh thưởng dành cho chó. Phân loại theo độ tuổi, kích thước và nhu cầu dinh dưỡng." },
  { code: "DM003", name: "Đồ chơi cho chó", parent: "DM001", pet: "Chó", order: 2, description: "Đồ chơi gặm, bóng và dây kéo giúp chó vận động." },
  { code: "DM004", name: "Phụ kiện cho chó", parent: "DM001", pet: "Chó", order: 3, description: "Vòng cổ, dây dắt, bát ăn và phụ kiện đi dạo." },
  { code: "DM005", name: "Mèo", parent: null, pet: "Mèo", order: 2, description: "Sản phẩm dành cho mèo: thức ăn, vệ sinh và phụ kiện." },
  { code: "DM006", name: "Thức ăn cho mèo", parent: "DM005", pet: "Mèo", order: 1, description: "Hạt, pate và súp thưởng cho mèo mọi lứa tuổi." },
  { code: "DM007", name: "Vệ sinh & cát mèo", parent: "DM005", pet: "Mèo", order: 2, description: "Cát vệ sinh, khay và sản phẩm khử mùi." },
  { code: "DM008", name: "Phụ kiện cho mèo", parent: "DM005", pet: "Mèo", order: 3, description: "Cần câu, trụ cào móng và nhà cây cho mèo." },
  { code: "DM009", name: "Chăm sóc sức khỏe", parent: null, pet: null, order: 3, description: "Sữa tắm, thuốc nhỏ gáy và vitamin cho thú cưng." },
];

export const categories: Category[] = seeds.map((seed) => ({ updatedAt: "08/10/2026", ...seed, slug: slugify(seed.name), status: "Hiển thị" }));

export function getCategory(code: string) {
  return categories.find((category) => category.code === code);
}

/** "Chó / Thức ăn cho chó" for a child, the plain name for a root. */
export function categoryPath(code: string) {
  const category = getCategory(code);
  if (!category) return "";
  const parent = category.parent ? getCategory(category.parent) : undefined;
  return parent ? `${parent.name} / ${category.name}` : category.name;
}

export function childCategories(code: string) {
  return categories.filter((category) => category.parent === code);
}

/** The category itself plus its children, so filtering by "Chó" includes dog food, toys and accessories. */
export function categoryScope(code: string) {
  return [code, ...childCategories(code).map((category) => category.code)];
}

/** Tree order: each root (by display order) followed by its children (by display order). */
export function categoryTree(list: Category[] = categories) {
  const byOrder = (a: Category, b: Category) => a.order - b.order;
  return list.filter((category) => !category.parent).sort(byOrder)
    .flatMap((root) => [root, ...list.filter((category) => category.parent === root.code).sort(byOrder)]);
}

export type CategoryFilter = { query: string; status: CategoryStatus | "all" };

/** Matching rows in tree order; a matching child keeps its parent row so the hierarchy stays readable. */
export function filterCategories({ query, status }: CategoryFilter) {
  const isMatch = (category: Category) => (status === "all" || category.status === status) && matchesQuery(query, category.name, category.code);
  const shown = new Set(categories.filter(isMatch).map((category) => category.code));
  for (const code of [...shown]) { const parent = getCategory(code)?.parent; if (parent) shown.add(parent); }
  // `context` marks a parent shown only to keep a matching child in place.
  return categoryTree(categories.filter((category) => shown.has(category.code))).map((category) => ({ category, context: !isMatch(category) }));
}
