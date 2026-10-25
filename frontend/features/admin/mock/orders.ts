import { orders as staffOrders, type Order, type OrderStatus } from "../../staff/mock-data.ts";
import type { AdminStatus } from "../status";
import { matchesQuery } from "./text.ts";

/**
 * Admin sees every order in the reporting period: today's orders shared with the Staff workspace
 * (same IDs, so both workspaces and the cancellation requests agree) plus earlier orders in the period.
 */
const earlierOrders: Order[] = [
  { id: "PA261011009", customer: "Lê Quang Huy", phone: "0923 456 780", date: "11/10/2026", time: "16:05", payment: "COD", status: "cancelled", total: 320_000, address: "15 Pasteur, Quận 1, TP.HCM", note: "", items: [{ sku: "PL-L01", quantity: 2 }] },
  { id: "PA261011008", customer: "Trần Bảo Ngọc", phone: "0912 456 789", date: "11/10/2026", time: "14:20", payment: "VNPay", status: "shipping", total: 870_000, address: "102 Hai Bà Trưng, Quận 3, TP.HCM", note: "", items: [{ sku: "RC-C02", quantity: 1 }, { sku: "CB-L05", quantity: 2 }] },
  { id: "PA261011007", customer: "Đỗ Khánh Linh", phone: "0945 678 901", date: "11/10/2026", time: "11:02", payment: "VNPay", status: "completed", total: 540_000, address: "8 Điện Biên Phủ, Bình Thạnh, TP.HCM", note: "", items: [{ sku: "RC-D02", quantity: 1 }, { sku: "WH-T01", quantity: 2 }] },
  { id: "PA261010006", customer: "Ngô Thanh Tâm", phone: "0976 445 566", date: "10/10/2026", time: "15:48", payment: "COD", status: "completed", total: 1_850_000, address: "60 Cách Mạng Tháng 8, Quận 10, TP.HCM", note: "", items: [{ sku: "RC-D15", quantity: 1 }] },
  { id: "PA261009005", customer: "Hoàng Gia Bảo", phone: "0938 112 233", date: "09/10/2026", time: "10:30", payment: "VNPay", status: "completed", total: 390_000, address: "21 Lý Tự Trọng, Quận 1, TP.HCM", note: "", items: [{ sku: "CB-L05", quantity: 2 }] },
  { id: "PA261007004", customer: "Bùi Ngọc Mai", phone: "0965 778 899", date: "07/10/2026", time: "19:12", payment: "COD", status: "completed", total: 255_000, address: "5 Nguyễn Trãi, Quận 5, TP.HCM", note: "", items: [{ sku: "KG-B01", quantity: 3 }] },
  { id: "PA261002031", customer: "Nguyễn Minh Anh", phone: "0901 234 567", date: "05/10/2026", time: "14:30", payment: "COD", status: "completed", total: 450_000, address: "28 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP.HCM", note: "", items: [{ sku: "RC-D02", quantity: 1 }] },
  { id: "PA261003002", customer: "Phạm Ngọc Linh", phone: "0987 112 233", date: "03/10/2026", time: "08:55", payment: "VNPay", status: "completed", total: 165_000, address: "44 Võ Văn Tần, TP.HCM", note: "", items: [{ sku: "PL-L01", quantity: 1 }] },
  { id: "PA261001001", customer: "Võ Thanh Tùng", phone: "0908 761 245", date: "01/10/2026", time: "09:15", payment: "COD", status: "cancelled", total: 420_000, address: "3 Phan Xích Long, TP.HCM", note: "", items: [{ sku: "RC-D02", quantity: 1 }] },
];

export const adminOrders: Order[] = [...staffOrders, ...earlierOrders];

/** Badge label per order status; packing is still part of the "Chờ xử lý" group for tabs. */
export const orderStatusLabel: Record<OrderStatus, Extract<AdminStatus, "Chờ xử lý" | "Đang đóng gói" | "Đang giao" | "Hoàn thành" | "Đã hủy">> = {
  pending: "Chờ xử lý", packing: "Đang đóng gói", shipping: "Đang giao", completed: "Hoàn thành", cancelled: "Đã hủy",
};

export type OrderTab = "all" | "processing" | "shipping" | "completed" | "cancelled";
const tabStatuses: Record<Exclude<OrderTab, "all">, OrderStatus[]> = {
  processing: ["pending", "packing"], shipping: ["shipping"], completed: ["completed"], cancelled: ["cancelled"],
};

export type OrderFilter = { tab: OrderTab; query: string; status: OrderStatus | "all" };

export function filterOrders({ tab, query, status }: OrderFilter) {
  return adminOrders.filter((order) => (tab === "all" || tabStatuses[tab].includes(order.status))
    && (status === "all" || order.status === status)
    && matchesQuery(query.replace(/^#/, ""), order.id, order.customer, order.phone));
}

export function countOrders(tab: OrderTab) {
  return filterOrders({ tab, query: "", status: "all" }).length;
}

export function getAdminOrder(id: string) {
  return adminOrders.find((order) => order.id === id);
}
