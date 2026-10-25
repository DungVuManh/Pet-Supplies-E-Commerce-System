/** Product category tree from the categories design (DM001–DM009); products reference these codes. */
export type Category = { code: string; name: string; parent: string | null; pet: "Chó" | "Mèo" | null };

export const categories: Category[] = [
  { code: "DM001", name: "Chó", parent: null, pet: "Chó" },
  { code: "DM002", name: "Thức ăn cho chó", parent: "DM001", pet: "Chó" },
  { code: "DM003", name: "Đồ chơi cho chó", parent: "DM001", pet: "Chó" },
  { code: "DM004", name: "Phụ kiện cho chó", parent: "DM001", pet: "Chó" },
  { code: "DM005", name: "Mèo", parent: null, pet: "Mèo" },
  { code: "DM006", name: "Thức ăn cho mèo", parent: "DM005", pet: "Mèo" },
  { code: "DM007", name: "Vệ sinh & cát mèo", parent: "DM005", pet: "Mèo" },
  { code: "DM008", name: "Phụ kiện cho mèo", parent: "DM005", pet: "Mèo" },
  { code: "DM009", name: "Chăm sóc sức khỏe", parent: null, pet: null },
];

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

/** The category itself plus its children, so filtering by "Chó" includes dog food, toys and accessories. */
export function categoryScope(code: string) {
  return [code, ...categories.filter((category) => category.parent === code).map((category) => category.code)];
}
