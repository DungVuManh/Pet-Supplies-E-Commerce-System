import { brandOptions, formatVnd, products } from "./products.ts";
import { matchesQuery, slugify } from "./text.ts";

export type MasterStatus = "Hoạt động" | "Tạm ngưng";
/** One row shape for every master-data tab: code, name + description, a tab-specific metric and status. */
export type MasterRow = { code: string; updatedAt: string; name: string; description: string; metric: string; status: MasterStatus };
export type MasterKind = "pets" | "breeds" | "brands" | "units" | "shipping";

type PetType = { code: string; name: string; description: string; updatedAt: string; status: MasterStatus };
const petTypes: PetType[] = [
  { code: "PET-DOG", name: "Chó", description: "Thức ăn, đồ chơi và phụ kiện cho chó", updatedAt: "10/10/2026", status: "Hoạt động" },
  { code: "PET-CAT", name: "Mèo", description: "Thức ăn, cát vệ sinh và phụ kiện cho mèo", updatedAt: "10/10/2026", status: "Hoạt động" },
  { code: "PET-BIRD", name: "Chim", description: "Thức ăn hạt và phụ kiện lồng chim", updatedAt: "05/10/2026", status: "Hoạt động" },
  { code: "PET-HAM", name: "Hamster", description: "Thức ăn và vật dụng cho thú nhỏ", updatedAt: "05/10/2026", status: "Hoạt động" },
  { code: "PET-FISH", name: "Cá cảnh", description: "Thức ăn và phụ kiện thủy sinh", updatedAt: "05/10/2026", status: "Tạm ngưng" },
];

const breedNames: Record<string, string[]> = {
  "PET-DOG": ["Poodle", "Corgi", "Golden Retriever", "Husky", "Shiba Inu", "Chihuahua", "Pug", "Phốc sóc", "Alaska", "Becgie Đức", "Bulldog Pháp", "Labrador"],
  "PET-CAT": ["Mèo Anh lông ngắn", "Mèo Ba Tư", "Mèo Xiêm", "Mèo Ragdoll", "Mèo Scottish Fold", "Mèo Maine Coon", "Mèo Munchkin", "Mèo ta"],
  "PET-BIRD": ["Vẹt", "Chào mào"],
  "PET-HAM": ["Hamster Bear", "Hamster Robo"],
};

const brandOrigins: Record<string, string> = {
  "Royal Canin": "Pháp · Thức ăn theo giống và độ tuổi", Catsan: "Đức · Cát vệ sinh cho mèo", KONG: "Mỹ · Đồ chơi cao su bền",
  Petkit: "Trung Quốc · Phụ kiện thông minh", Whiskas: "Thái Lan · Pate và hạt cho mèo", Pedigree: "Thái Lan · Thức ăn cho chó",
  SmartHeart: "Thái Lan · Thức ăn cho chó", Trixie: "Đức · Phụ kiện và đồ chơi", "Me-O": "Thái Lan · Thức ăn cho mèo",
  "Cat's Best": "Đức · Cát hữu cơ", "Bio-Groom": "Mỹ · Sữa tắm và chăm sóc lông", Virbac: "Pháp · Thuốc và vitamin thú y",
};

const unitDescriptions: Record<string, string> = {
  Túi: "Thức ăn hạt đóng gói", Hộp: "Pate, bánh thưởng đóng hộp", Cái: "Đồ chơi, phụ kiện bán lẻ",
  Gói: "Pate gói, súp thưởng", Bao: "Cát vệ sinh khối lượng lớn", Chai: "Sữa tắm, dung dịch chăm sóc",
};

const shippingMethods: MasterRow[] = [
  { code: "SHIP-STD", updatedAt: "09/10/2026", name: "Giao hàng tiêu chuẩn", description: "Giao trong 2–4 ngày làm việc", metric: formatVnd(30_000), status: "Hoạt động" },
  { code: "SHIP-EXP", updatedAt: "09/10/2026", name: "Giao hàng hỏa tốc", description: "Nội thành TP. Hồ Chí Minh", metric: formatVnd(45_000), status: "Hoạt động" },
  { code: "SHIP-PICK", updatedAt: "09/10/2026", name: "Nhận tại cửa hàng", description: "28 Nguyễn Thị Minh Khai, Quận 1", metric: formatVnd(0), status: "Hoạt động" },
];

export const petTypeOptions = petTypes.filter((pet) => pet.status === "Hoạt động").map((pet) => pet.name);
export const unitOptions = Object.keys(unitDescriptions);

const breedRows: MasterRow[] = petTypes.flatMap((pet) => (breedNames[pet.code] ?? []).map((name) => ({ name, pet })))
  .map(({ name, pet }, index) => ({ code: `BR-${String(index + 1).padStart(3, "0")}`, updatedAt: "05/10/2026", name, description: `Giống ${pet.name.toLowerCase()}`, metric: pet.name, status: "Hoạt động" as const }));

const productCount = (match: (unit: string, brand: string) => boolean) => products.filter((product) => match(product.unit, product.brand)).length;

export const masterData: Record<MasterKind, MasterRow[]> = {
  pets: petTypes.map((pet) => ({ ...pet, metric: `${breedNames[pet.code]?.length ?? 0} giống` })),
  breeds: breedRows,
  brands: brandOptions.map((brand) => ({
    code: `BRD-${slugify(brand).toUpperCase()}`, updatedAt: "08/10/2026", name: brand, description: brandOrigins[brand] ?? "",
    metric: `${productCount((_, b) => b === brand)} sản phẩm`, status: "Hoạt động",
  })),
  units: unitOptions.map((unit) => ({
    code: `UNIT-${slugify(unit).toUpperCase()}`, updatedAt: "01/10/2026", name: unit, description: unitDescriptions[unit],
    metric: `${productCount((u) => u === unit)} sản phẩm`, status: "Hoạt động",
  })),
  shipping: shippingMethods,
};

/** Tab labels and column headers per kind, from the master-data design. */
export const masterTabs: { kind: MasterKind; label: string; add: string; search: string; codeHeader: string; nameHeader: string; metricHeader: string }[] = [
  { kind: "pets", label: "Loài thú cưng", add: "Thêm loài", search: "Tên hoặc mã loài", codeHeader: "Mã loài", nameHeader: "Loài thú cưng / Mô tả", metricHeader: "Số giống" },
  { kind: "breeds", label: "Giống", add: "Thêm giống", search: "Tên hoặc mã giống", codeHeader: "Mã giống", nameHeader: "Giống / Mô tả", metricHeader: "Loài" },
  { kind: "brands", label: "Thương hiệu", add: "Thêm thương hiệu", search: "Tên hoặc mã thương hiệu", codeHeader: "Mã thương hiệu", nameHeader: "Thương hiệu / Xuất xứ", metricHeader: "Sản phẩm" },
  { kind: "units", label: "Đơn vị", add: "Thêm đơn vị", search: "Tên hoặc mã đơn vị", codeHeader: "Mã đơn vị", nameHeader: "Đơn vị / Cách dùng", metricHeader: "Sản phẩm" },
  { kind: "shipping", label: "Vận chuyển", add: "Thêm phương thức", search: "Tên hoặc mã phương thức", codeHeader: "Mã phương thức", nameHeader: "Phương thức / Mô tả", metricHeader: "Phí" },
];

export type MasterFilter = { query: string; status: MasterStatus | "all" };

export function filterMasterData(kind: MasterKind, { query, status }: MasterFilter) {
  return masterData[kind].filter((row) => (status === "all" || row.status === status) && matchesQuery(query, row.code, row.name, row.description));
}

/** Short "a, b, c" preview used by the summary cards under the table. */
export function preview(kind: MasterKind, count: number) {
  return masterData[kind].slice(0, count).map((row) => row.name).join(", ");
}
