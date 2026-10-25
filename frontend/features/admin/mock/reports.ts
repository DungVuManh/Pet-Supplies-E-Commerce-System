import type { AdminStatus } from "../status";
import { matchesQuery } from "./text.ts";

export const reportPeriod = "01–12/10/2026";

/* -------------------------------------------------------------------------- */
/* 9a. Financial Report Data                                                  */
/* -------------------------------------------------------------------------- */

export const financeKpis = {
  grossRevenue: 132_650_000,
  grossOrders: 286,
  refunds: 4_200_000,
  refundTransactions: 8,
  netRevenue: 128_450_000,
  pendingReconciliation: 8_450_000,
  pendingTransactions: 19,
};

export type PaymentChannel = {
  id: string;
  channel: "BANK" | "VNPAY" | "COD";
  channelName: string;
  detailTitle: string;
  income: number;
  refund: number;
  transactions: number;
  net: number;
  status: Extract<AdminStatus, "Đã đối soát" | "Chờ đối soát">;
};

export const paymentChannels: PaymentChannel[] = [
  {
    id: "bank",
    channel: "BANK",
    channelName: "Chuyển khoản",
    detailTitle: "Chuyển khoản ngân hàng",
    income: 56_200_000,
    refund: 1_800_000,
    transactions: 122,
    net: 54_400_000,
    status: "Đã đối soát",
  },
  {
    id: "vnpay",
    channel: "VNPAY",
    channelName: "Ví / thẻ trực tuyến",
    detailTitle: "VNPay",
    income: 42_850_000,
    refund: 1_200_000,
    transactions: 94,
    net: 41_650_000,
    status: "Đã đối soát",
  },
  {
    id: "cod",
    channel: "COD",
    channelName: "Thu hộ",
    detailTitle: "Thanh toán khi nhận hàng",
    income: 33_600_000,
    refund: 1_200_000,
    transactions: 70,
    net: 32_400_000,
    status: "Chờ đối soát",
  },
];

/* -------------------------------------------------------------------------- */
/* 9b. Sales Report Data                                                      */
/* -------------------------------------------------------------------------- */

export const salesKpis = {
  itemsSold: 642,
  itemsSoldGrowth: "+14,2% so với kỳ trước",
  averageOrderValue: 463_811,
  averageOrderDetail: "132.650.000 ₫ / 286 đơn",
  topCategory: "Thức ăn cho chó",
  topCategoryShare: "41,5% doanh thu gộp",
};

export const dailySalesVolume: { label: string; value: number }[] = [
  { label: "01/10", value: 38 },
  { label: "02/10", value: 45 },
  { label: "03/10", value: 52 },
  { label: "04/10", value: 48 },
  { label: "05/10", value: 65 },
  { label: "06/10", value: 42 },
  { label: "07/10", value: 55 },
  { label: "08/10", value: 60 },
  { label: "09/10", value: 50 },
  { label: "10/10", value: 62 },
  { label: "11/10", value: 58 },
  { label: "12/10", value: 67 },
];

export type ProductSalesRow = {
  sku: string;
  name: string;
  staff: string;
  orders: number;
  share: string;
  revenue: number;
  quantity: number;
  unit: string;
};

export const productSales: ProductSalesRow[] = [
  {
    sku: "RC-MA-2KG",
    name: "Royal Canin Mini Adult 2 kg",
    staff: "Phạm Thu Hà",
    orders: 38,
    share: "41,5% doanh thu danh mục",
    revenue: 21_600_000,
    quantity: 48,
    unit: "túi",
  },
  {
    sku: "RC-IN-2KG",
    name: "Royal Canin Indoor 2 kg",
    staff: "Vũ Đức Long",
    orders: 29,
    share: "31,2% doanh thu danh mục",
    revenue: 18_200_000,
    quantity: 35,
    unit: "túi",
  },
  {
    sku: "CT-BEN-10L",
    name: "Cát vệ sinh Catsan 10 L",
    staff: "Phạm Thu Hà",
    orders: 34,
    share: "24,8% doanh thu danh mục",
    revenue: 7_770_000,
    quantity: 42,
    unit: "bao",
  },
  {
    sku: "KG-CL-M",
    name: "Đồ chơi KONG Classic M",
    staff: "Hoàng Gia Bảo",
    orders: 20,
    share: "18,5% doanh thu danh mục",
    revenue: 4_250_000,
    quantity: 24,
    unit: "cái",
  },
  {
    sku: "PT-HN-M",
    name: "Dây yếm Petkit size M",
    staff: "Vũ Đức Long",
    orders: 16,
    share: "14,2% doanh thu danh mục",
    revenue: 3_800_000,
    quantity: 20,
    unit: "cái",
  },
  {
    sku: "WM-PATE-85",
    name: "Pate Whiskas cá ngừ 85 g",
    staff: "Phạm Thu Hà",
    orders: 45,
    share: "35,6% doanh thu danh mục",
    revenue: 5_280_000,
    quantity: 88,
    unit: "gói",
  },
];

export type CategorySalesRow = {
  category: string;
  revenue: number;
  orders: number;
  quantity: number;
  share: string;
};

export const categorySales: CategorySalesRow[] = [
  { category: "Thức ăn cho chó", revenue: 55_050_000, orders: 118, quantity: 180, share: "41,5% tổng doanh thu" },
  { category: "Thức ăn cho mèo", revenue: 42_450_000, orders: 92, quantity: 215, share: "32,0% tổng doanh thu" },
  { category: "Vệ sinh & cát mèo", revenue: 18_650_000, orders: 40, quantity: 125, share: "14,1% tổng doanh thu" },
  { category: "Đồ chơi & Phụ kiện", revenue: 16_500_000, orders: 36, quantity: 122, share: "12,4% tổng doanh thu" },
];

export type StaffSalesRow = {
  staff: string;
  role: string;
  revenue: number;
  orders: number;
  topProduct: string;
};

export const staffSales: StaffSalesRow[] = [
  { staff: "Phạm Thu Hà", role: "Nhân viên kinh doanh", revenue: 58_420_000, orders: 126, topProduct: "Royal Canin Mini Adult 2 kg" },
  { staff: "Vũ Đức Long", role: "Nhân viên kinh doanh", revenue: 44_630_000, orders: 95, topProduct: "Royal Canin Indoor 2 kg" },
  { staff: "Hoàng Gia Bảo", role: "Nhân viên kho vận & bán lẻ", revenue: 29_600_000, orders: 65, topProduct: "Đồ chơi KONG Classic M" },
];

export type TimeSalesRow = {
  period: string;
  revenue: number;
  orders: number;
  quantity: number;
};

export const timeSales: TimeSalesRow[] = [
  { period: "Tuần 1 (01–04/10)", revenue: 38_250_000, orders: 82, quantity: 183 },
  { period: "Tuần 2 (05–11/10)", revenue: 76_400_000, orders: 165, quantity: 392 },
  { period: "Tuần 3 (12/10)", revenue: 18_000_000, orders: 39, quantity: 67 },
];

/* -------------------------------------------------------------------------- */
/* 9c. Inventory Report Data                                                  */
/* -------------------------------------------------------------------------- */

export const inventoryKpis = {
  closingTotal: 3842,
  catalogSkus: 124,
  inTotal: 1250,
  inReceipts: 16,
  outTotal: 642,
  outOrders: 286,
  lowStockCount: 8,
};

export type InventoryReportRow = {
  sku: string;
  name: string;
  category: string;
  opening: number;
  inQty: number;
  outQty: number;
  closing: number;
  threshold: number;
  warning: Extract<AdminStatus, "Đủ hàng" | "Sắp hết" | "Hết hàng">;
};

export const inventoryReportRows: InventoryReportRow[] = [
  {
    sku: "RC-MA-2KG",
    name: "Royal Canin Mini Adult 2 kg",
    category: "Thức ăn cho chó",
    opening: 96,
    inQty: 72,
    outQty: 48,
    closing: 120,
    threshold: 20,
    warning: "Đủ hàng",
  },
  {
    sku: "RC-IN-2KG",
    name: "Royal Canin Indoor 2 kg",
    category: "Thức ăn cho mèo",
    opening: 80,
    inQty: 40,
    outQty: 35,
    closing: 85,
    threshold: 20,
    warning: "Đủ hàng",
  },
  {
    sku: "CT-BEN-10L",
    name: "Cát vệ sinh Catsan 10 L",
    category: "Vệ sinh & cát mèo",
    opening: 30,
    inQty: 20,
    outQty: 42,
    closing: 8,
    threshold: 20,
    warning: "Sắp hết",
  },
  {
    sku: "KG-CL-M",
    name: "Đồ chơi KONG Classic M",
    category: "Đồ chơi cho chó",
    opening: 24,
    inQty: 12,
    outQty: 24,
    closing: 12,
    threshold: 15,
    warning: "Sắp hết",
  },
  {
    sku: "PT-HN-M",
    name: "Dây yếm Petkit size M",
    category: "Phụ kiện cho chó",
    opening: 18,
    inQty: 8,
    outQty: 20,
    closing: 6,
    threshold: 10,
    warning: "Sắp hết",
  },
  {
    sku: "WM-PATE-85",
    name: "Pate Whiskas cá ngừ 85 g",
    category: "Thức ăn cho mèo",
    opening: 60,
    inQty: 100,
    outQty: 88,
    closing: 72,
    threshold: 30,
    warning: "Đủ hàng",
  },
];

export function filterInventoryReport(
  rows: InventoryReportRow[],
  filter: { search?: string; category?: string }
): InventoryReportRow[] {
  const query = filter.search ?? "";
  const cat = filter.category && filter.category !== "Tất cả danh mục" ? filter.category : null;

  return rows.filter((row) => {
    if (cat && row.category !== cat) return false;
    if (!query) return true;
    const searchable = `${row.sku} ${row.name} ${row.category}`;
    return matchesQuery(query, searchable);
  });
}
