import type { AdminStatus } from "../status";

/** Business period shown on the dashboard and reports. */
export const reportPeriod = "01–12/10/2026";

export const overview = {
  netRevenue: 128_450_000,
  netRevenueGrowth: "+12,8%",
  orders: 286,
  ordersInPeriod: 24,
  newUsers: 48,
  newUsersGrowth: "+8,6%",
};

/** Cumulative net revenue in million VND; the last point equals `overview.netRevenue`. */
export const cumulativeRevenue: { label: string; value: number }[] = [
  { label: "01/10", value: 2.1 }, { label: "02/10", value: 9.8 }, { label: "03/10", value: 19.6 },
  { label: "04/10", value: 30.2 }, { label: "05/10", value: 41.5 }, { label: "06/10", value: 52.4 },
  { label: "07/10", value: 66 }, { label: "08/10", value: 79.8 }, { label: "09/10", value: 92.6 },
  { label: "10/10", value: 104.3 }, { label: "11/10", value: 116.9 }, { label: "12/10", value: 128.45 },
];

export type Activity = { id: string; time: string; day: string; title: string; detail: string; value: string; status: AdminStatus; href: string };

export const recentActivity: Activity[] = [
  { id: "act-order", time: "12/10 · 10:42", day: "Hôm nay", title: "Đơn #PA261012018 được tạo", detail: "Nguyễn Minh Anh · Royal Canin Mini Adult 2 kg", value: "450.000 ₫", status: "Chờ xử lý", href: "/admin/orders?q=PA261012018" },
  { id: "act-stock", time: "12/10 · 10:15", day: "Hôm nay", title: "Phạm Thu Hà cập nhật sản phẩm", detail: "RC-MA-2KG · Điều chỉnh tồn kho: 124 → 120", value: "−4 sản phẩm", status: "Đã ghi nhận", href: "/admin/products/RC-MA-2KG" },
  { id: "act-user", time: "12/10 · 09:30", day: "Hôm nay", title: "Tài khoản khách hàng mới", detail: "Đỗ Khánh Linh · khanhlinh.do@gmail.com", value: "Customer", status: "Hoạt động", href: "/admin/users/KH0004" },
];
