import { categoryScope, childCategories, getCategory } from "./categories.ts";
import { getStockItem } from "./inventory.ts";
import { matchesQuery } from "./text.ts";

export type ProductVisibility = "Đang bán" | "Đã ẩn";
export type ProductStatus = ProductVisibility | "Sắp hết hàng";
export type Product = {
  id: string; sku: string; name: string; categoryCode: string; brand: string; petType: string;
  price: number; cost: number; unit: string; weight: string; stock: number; threshold: number; visibility: ProductVisibility;
  image?: string; hasOrders: boolean; updatedAt: string; updatedBy: string;
  descriptionTitle: string; description: string; ingredients: string;
};

const img = (name: string) => `/images/products/${name}.png`;
const stockOf = (sku: string) => {
  const level = getStockItem(sku);
  if (!level) throw new Error(`Missing stock level for ${sku}`);
  return { stock: level.available, threshold: level.threshold };
};

const designed: Product[] = [
  {
    id: "SP0001", sku: "RC-MA-2KG", name: "Royal Canin Mini Adult 2 kg", categoryCode: "DM002", brand: "Royal Canin", petType: "Chó",
    price: 450_000, cost: 325_000, unit: "Túi", weight: "2 kg", ...stockOf("RC-MA-2KG"), visibility: "Đang bán", image: img("royal-canin-mini-adult"),
    hasOrders: true, updatedAt: "12/10/2026 lúc 10:15", updatedBy: "Phạm Thu Hà · Staff",
    descriptionTitle: "Dinh dưỡng cho chó trưởng thành giống nhỏ",
    description: "Thức ăn hạt dành cho chó trưởng thành từ 10 tháng tuổi, cân nặng 1–10 kg. Hỗ trợ tiêu hóa, duy trì cân nặng và giúp da, lông khỏe mạnh. Đóng gói 2 kg; bảo quản nơi khô ráo, tránh ánh nắng trực tiếp.",
    ingredients: "Thành phần: protein gia cầm, gạo, ngô, chất béo động vật và khoáng chất. Hướng dẫn: điều chỉnh khẩu phần theo cân nặng, luôn cung cấp nước sạch.",
  },
  {
    id: "SP0002", sku: "RC-IN-2KG", name: "Royal Canin Indoor 2 kg", categoryCode: "DM006", brand: "Royal Canin", petType: "Mèo",
    price: 520_000, cost: 378_000, unit: "Túi", weight: "2 kg", ...stockOf("RC-IN-2KG"), visibility: "Đang bán", image: img("royal-canin-indoor"),
    hasOrders: true, updatedAt: "11/10/2026 lúc 16:20", updatedBy: "Vũ Đức Long · Staff",
    descriptionTitle: "Dinh dưỡng cho mèo sống trong nhà",
    description: "Thức ăn hạt cho mèo trưởng thành ít vận động, giúp kiểm soát cân nặng, giảm mùi phân và hạn chế búi lông.",
    ingredients: "Thành phần: protein gia cầm, gạo, chất xơ thực vật, dầu cá. Hướng dẫn: chia 2–3 bữa mỗi ngày.",
  },
  {
    id: "SP0003", sku: "CT-BEN-10L", name: "Cát vệ sinh Catsan 10 L", categoryCode: "DM007", brand: "Catsan", petType: "Mèo",
    price: 185_000, cost: 120_000, unit: "Bao", weight: "10 L", ...stockOf("CT-BEN-10L"), visibility: "Đang bán", image: img("cats-best-original"),
    hasOrders: true, updatedAt: "12/10/2026 lúc 09:50", updatedBy: "Phạm Thu Hà · Staff",
    descriptionTitle: "Cát vệ sinh khử mùi cho mèo", description: "Cát khoáng thấm hút nhanh, khử mùi hiệu quả và ít bụi.",
    ingredients: "Thành phần: khoáng tự nhiên. Hướng dẫn: thay cát hoàn toàn mỗi 1–2 tuần.",
  },
  {
    id: "SP0004", sku: "KG-CL-M", name: "Đồ chơi KONG Classic M", categoryCode: "DM003", brand: "KONG", petType: "Chó",
    price: 260_000, cost: 170_000, unit: "Cái", weight: "Size M", ...stockOf("KG-CL-M"), visibility: "Đang bán", image: img("kong-ball"),
    hasOrders: true, updatedAt: "11/10/2026 lúc 14:10", updatedBy: "Vũ Đức Long · Staff",
    descriptionTitle: "Đồ chơi cao su bền cho chó", description: "Đồ chơi cao su tự nhiên có thể nhồi thức ăn, giúp chó giải trí và giảm căng thẳng.",
    ingredients: "Chất liệu: cao su tự nhiên. Phù hợp chó 7–16 kg.",
  },
  {
    id: "SP0005", sku: "PT-HN-M", name: "Dây yếm Petkit size M", categoryCode: "DM004", brand: "Petkit", petType: "Chó",
    price: 320_000, cost: 210_000, unit: "Cái", weight: "Size M", ...stockOf("PT-HN-M"), visibility: "Đang bán",
    hasOrders: true, updatedAt: "10/10/2026 lúc 11:20", updatedBy: "Phạm Thu Hà · Staff",
    descriptionTitle: "Dây yếm đi dạo thoáng khí", description: "Dây yếm vải lưới thoáng khí, khóa an toàn và phản quang cho buổi đi dạo buổi tối.",
    ingredients: "Chất liệu: vải lưới polyester. Vòng ngực 45–60 cm.",
  },
  {
    id: "SP0006", sku: "WM-PATE-85", name: "Pate Whiskas cá ngừ 85 g", categoryCode: "DM006", brand: "Whiskas", petType: "Mèo",
    price: 18_000, cost: 11_000, unit: "Gói", weight: "85 g", ...stockOf("WM-PATE-85"), visibility: "Đã ẩn",
    hasOrders: true, updatedAt: "09/10/2026 lúc 08:30", updatedBy: "Lê Hoàng Nam · Admin",
    descriptionTitle: "Pate cá ngừ cho mèo", description: "Pate mềm vị cá ngừ, bổ sung độ ẩm cho mèo trưởng thành.",
    ingredients: "Thành phần: cá ngừ, gan gà, vitamin và khoáng chất.",
  },
];

/** Filler per category so per-category totals match the categories design (124 products in all). */
const fillerPlan: { code: string; count: number; prefix: string; pet: string; unit: string; base: number; names: string[]; brands: string[] }[] = [
  { code: "DM002", count: 23, prefix: "DF", pet: "Chó", unit: "Túi", base: 150_000, names: ["Hạt cho chó trưởng thành", "Hạt cho chó con", "Pate cho chó", "Bánh thưởng cho chó"], brands: ["Royal Canin", "Pedigree", "SmartHeart"] },
  { code: "DM003", count: 13, prefix: "DT", pet: "Chó", unit: "Cái", base: 90_000, names: ["Bóng cao su", "Xương gặm", "Dây kéo co"], brands: ["KONG", "Petkit", "Trixie"] },
  { code: "DM004", count: 9, prefix: "DA", pet: "Chó", unit: "Cái", base: 120_000, names: ["Vòng cổ", "Dây dắt", "Bát ăn inox"], brands: ["Petkit", "Trixie"] },
  { code: "DM006", count: 30, prefix: "CF", pet: "Mèo", unit: "Gói", base: 25_000, names: ["Pate cho mèo", "Hạt cho mèo trưởng thành", "Súp thưởng cho mèo"], brands: ["Whiskas", "Me-O", "Royal Canin"] },
  { code: "DM007", count: 15, prefix: "CL", pet: "Mèo", unit: "Bao", base: 140_000, names: ["Cát đậu nành", "Cát khoáng", "Cát gỗ"], brands: ["Catsan", "Cat's Best"] },
  { code: "DM008", count: 8, prefix: "CA", pet: "Mèo", unit: "Cái", base: 110_000, names: ["Cần câu mèo", "Trụ cào móng", "Nhà cây cho mèo"], brands: ["Petkit", "Trixie"] },
  { code: "DM009", count: 20, prefix: "HC", pet: "Chó", unit: "Chai", base: 95_000, names: ["Sữa tắm", "Thuốc nhỏ gáy", "Vitamin tổng hợp"], brands: ["Bio-Groom", "Virbac"] },
];

function fillerProducts(): Product[] {
  const out: Product[] = [];
  let n = designed.length;
  for (const plan of fillerPlan) {
    for (let i = 0; i < plan.count; i += 1) {
      n += 1;
      const name = plan.names[i % plan.names.length], brand = plan.brands[i % plan.brands.length];
      const threshold = 10 + (n % 3) * 5;
      // Exactly five filler items sit below threshold (n = 23, 46, 69, 92, 115) and five are hidden (n = 24, 48, 72, 96, 120).
      const stock = n % 23 === 0 ? threshold - 3 : threshold + 15 + ((n * 37) % 120);
      const price = plan.base + ((n * 7) % 10) * 10_000;
      out.push({
        id: `SP${String(n).padStart(4, "0")}`, sku: `${plan.prefix}-${String(n).padStart(3, "0")}`, name: `${name} ${brand} ${i + 1}`,
        categoryCode: plan.code, brand, petType: plan.pet, price, cost: Math.round(price * 0.7 / 1000) * 1000, unit: plan.unit, weight: "—",
        stock, threshold, visibility: n % 24 === 0 ? "Đã ẩn" : "Đang bán", hasOrders: n % 4 !== 0,
        updatedAt: `${String(1 + (n % 12)).padStart(2, "0")}/10/2026 lúc 09:00`, updatedBy: "Phạm Thu Hà · Staff",
        descriptionTitle: `${name} ${brand}`, description: `${name} chính hãng ${brand}, phù hợp cho ${plan.pet.toLowerCase()} mọi lứa tuổi.`, ingredients: "",
      });
    }
  }
  return out;
}

export const products: Product[] = [...designed, ...fillerProducts()];

export function getProduct(sku: string) {
  return products.find((product) => product.sku === sku);
}

/** List badge: hidden wins, then below-threshold stock, otherwise on sale. */
export function productStatus(product: Pick<Product, "visibility" | "stock" | "threshold">): ProductStatus {
  if (product.visibility === "Đã ẩn") return "Đã ẩn";
  return product.stock < product.threshold ? "Sắp hết hàng" : "Đang bán";
}

export function countProducts(tab: ProductVisibility | "all") {
  return tab === "all" ? products.length : products.filter((product) => product.visibility === tab).length;
}

export type ProductFilter = { tab: ProductVisibility | "all"; query: string; category: string; status: ProductStatus | "all" };

export function filterProducts({ tab, query, category, status }: ProductFilter) {
  const scope = category === "all" ? null : categoryScope(category);
  return products.filter((product) => (tab === "all" || product.visibility === tab)
    && (!scope || scope.includes(product.categoryCode))
    && (status === "all" || productStatus(product) === status)
    && matchesQuery(query, product.sku, product.id, product.name, product.brand));
}

/** Products linked to a category, including those in its child categories. */
export function categoryProductCount(code: string) {
  const scope = categoryScope(code);
  return products.filter((product) => scope.includes(product.categoryCode)).length;
}

/** Why a category cannot be deleted, or null when nothing blocks it (deletion itself awaits the backend). */
export function categoryDeleteBlocker(code: string) {
  const linked = categoryProductCount(code);
  if (linked > 0) return `còn ${linked} sản phẩm liên kết`;
  if (childCategories(code).length > 0) return "còn danh mục con";
  return null;
}

export function productCategoryName(product: Product) {
  return getCategory(product.categoryCode)?.name ?? "";
}

export const brandOptions = [...new Set(products.map((product) => product.brand))].sort((a, b) => a.localeCompare(b, "vi"));

export function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}
