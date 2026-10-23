/** Stock levels shared by the dashboard, inventory and inventory-report screens. */
export type StockLevel = { sku: string; name: string; shortName: string; available: number; threshold: number };

export const stockLevels: StockLevel[] = [
  { sku: "RC-MA-2KG", name: "Royal Canin Mini Adult 2 kg", shortName: "Royal Canin Mini Adult 2 kg", available: 120, threshold: 20 },
  { sku: "RC-IN-2KG", name: "Royal Canin Indoor 2 kg", shortName: "Royal Canin Indoor 2 kg", available: 85, threshold: 20 },
  { sku: "CT-BEN-10L", name: "Cát vệ sinh Catsan 10 L", shortName: "Catsan 10 L", available: 8, threshold: 20 },
  { sku: "KG-CL-M", name: "Đồ chơi KONG Classic M", shortName: "KONG Classic M", available: 12, threshold: 15 },
  { sku: "PT-HN-M", name: "Dây yếm Petkit size M", shortName: "Petkit size M", available: 6, threshold: 10 },
  { sku: "WM-PATE-85", name: "Pate Whiskas cá ngừ 85 g", shortName: "Pate Whiskas cá ngừ 85 g", available: 72, threshold: 30 },
];

/** Products below threshold across the whole 124-SKU catalog; the sample rows above hold the first few. */
export const lowStockTotal = 8;

export function isLowStock(level: StockLevel) {
  return level.available < level.threshold;
}

export function lowStockLevels() {
  return stockLevels.filter(isLowStock);
}
