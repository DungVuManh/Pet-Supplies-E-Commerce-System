import type { AdminStatus } from "../status";
import { matchesQuery } from "./text.ts";

/** Stock levels shared by the dashboard, inventory and inventory-report screens. */
export type StockLevel = {
  sku: string;
  name: string;
  shortName: string;
  category: string;
  brand: string;
  unit: string;
  available: number;
  threshold: number;
};

export const stockLevels: StockLevel[] = [
  {
    sku: "RC-MA-2KG",
    name: "Royal Canin Mini Adult 2 kg",
    shortName: "Royal Canin Mini Adult 2 kg",
    category: "Thức ăn cho chó",
    brand: "Royal Canin",
    unit: "túi",
    available: 120,
    threshold: 20,
  },
  {
    sku: "RC-IN-2KG",
    name: "Royal Canin Indoor 2 kg",
    shortName: "Royal Canin Indoor 2 kg",
    category: "Thức ăn cho mèo",
    brand: "Royal Canin",
    unit: "túi",
    available: 85,
    threshold: 20,
  },
  {
    sku: "CT-BEN-10L",
    name: "Cát vệ sinh Catsan 10 L",
    shortName: "Catsan 10 L",
    category: "Vệ sinh & cát mèo",
    brand: "Catsan",
    unit: "bao",
    available: 8,
    threshold: 20,
  },
  {
    sku: "KG-CL-M",
    name: "Đồ chơi KONG Classic M",
    shortName: "KONG Classic M",
    category: "Đồ chơi cho chó",
    brand: "KONG",
    unit: "cái",
    available: 12,
    threshold: 15,
  },
  {
    sku: "PT-HN-M",
    name: "Dây yếm Petkit size M",
    shortName: "Petkit size M",
    category: "Phụ kiện cho chó",
    brand: "Petkit",
    unit: "cái",
    available: 6,
    threshold: 10,
  },
  {
    sku: "WM-PATE-85",
    name: "Pate Whiskas cá ngừ 85 g",
    shortName: "Pate Whiskas cá ngừ 85 g",
    category: "Thức ăn cho mèo",
    brand: "Whiskas",
    unit: "gói",
    available: 72,
    threshold: 30,
  },
];

/** Products below threshold across the whole 124-SKU catalog; the sample rows above hold the first few. */
export const lowStockTotal = 8;

export function isLowStock(level: StockLevel) {
  return level.available < level.threshold;
}

export function lowStockLevels() {
  return stockLevels.filter(isLowStock);
}

export function getStockWarning(level: StockLevel): Extract<AdminStatus, "Đủ hàng" | "Sắp hết" | "Hết hàng"> {
  if (level.available === 0) return "Hết hàng";
  if (level.available < level.threshold) return "Sắp hết";
  return "Đủ hàng";
}

export function getStockItem(sku: string): StockLevel | undefined {
  return stockLevels.find((item) => item.sku === sku);
}

export type StockHistoryEntry = {
  id: string;
  sku: string;
  productName: string;
  type: "Nhập kho" | "Xuất kho";
  quantity: number;
  date: string;
  performer: string;
  note: string;
};

export const stockHistory: StockHistoryEntry[] = [
  {
    id: "PN-261012-001",
    sku: "RC-MA-2KG",
    productName: "Royal Canin Mini Adult 2 kg",
    type: "Nhập kho",
    quantity: 50,
    date: "12/10/2026 · 10:15",
    performer: "Trần Văn Hùng (Thủ kho)",
    note: "Nhập định kỳ theo đơn đặt hàng NCC Royal Canin",
  },
  {
    id: "PX-261012-018",
    sku: "RC-MA-2KG",
    productName: "Royal Canin Mini Adult 2 kg",
    type: "Xuất kho",
    quantity: -1,
    date: "12/10/2026 · 10:45",
    performer: "Lê Thị Lan (Đóng gói)",
    note: "Xuất giao đơn hàng #PA261012018",
  },
  {
    id: "PX-261012-015",
    sku: "CT-BEN-10L",
    productName: "Cát vệ sinh Catsan 10 L",
    type: "Xuất kho",
    quantity: -2,
    date: "12/10/2026 · 09:50",
    performer: "Lê Thị Lan (Đóng gói)",
    note: "Xuất giao đơn hàng #PA261012015",
  },
  {
    id: "PN-261011-003",
    sku: "WM-PATE-85",
    productName: "Pate Whiskas cá ngừ 85 g",
    type: "Nhập kho",
    quantity: 100,
    date: "11/10/2026 · 15:30",
    performer: "Trần Văn Hùng (Thủ kho)",
    note: "Nhập bổ sung lô hàng số L-8823",
  },
  {
    id: "PX-261011-008",
    sku: "KG-CL-M",
    productName: "Đồ chơi KONG Classic M",
    type: "Xuất kho",
    quantity: -3,
    date: "11/10/2026 · 14:10",
    performer: "Nguyễn Văn Tuấn (Kho vận)",
    note: "Xuất điều chuyển mẫu trưng bày",
  },
  {
    id: "PX-261010-004",
    sku: "PT-HN-M",
    productName: "Dây yếm Petkit size M",
    type: "Xuất kho",
    quantity: -4,
    date: "10/10/2026 · 11:20",
    performer: "Nguyễn Văn Tuấn (Kho vận)",
    note: "Xuất giao đơn khách sỉ",
  },
];

export function filterStockLevels(
  items: StockLevel[],
  filter: { search?: string; status?: string; lowStockOnly?: boolean }
): StockLevel[] {
  const query = filter.search ?? "";
  const statusFilter = filter.status && filter.status !== "Tất cả" ? filter.status : null;

  return items.filter((item) => {
    if (filter.lowStockOnly && !isLowStock(item)) return false;

    if (statusFilter) {
      const warning = getStockWarning(item);
      if (warning !== statusFilter) return false;
    }

    if (!query) return true;
    const searchable = `${item.sku} ${item.name} ${item.category} ${item.brand}`;
    return matchesQuery(query, searchable);
  });
}

export function filterStockHistory(
  entries: StockHistoryEntry[],
  search?: string
): StockHistoryEntry[] {
  if (!search) return entries;
  const query = search;
  return entries.filter((entry) => {
    const searchable = `${entry.id} ${entry.sku} ${entry.productName} ${entry.type} ${entry.performer} ${entry.note}`;
    return matchesQuery(query, searchable);
  });
}
