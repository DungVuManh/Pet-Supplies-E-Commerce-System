import { orderStatusLabels, paymentMethodLabels, paymentStatusLabels, productStatusLabels } from "../status.ts";
import type { AdminOrderExportRow, AdminProductRow } from "../types";
import type { ExportSection } from "./export-excel";

/** The date part of a file name, in Vietnam time: "2026-11-08". */
export function fileDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}

/** Product list columns. Cost is never exported. Amounts stay numbers so a spreadsheet can sum them. */
export function productSection(rows: AdminProductRow[]): ExportSection {
  return {
    headers: ["SKU", "Mã sản phẩm", "Tên sản phẩm", "Thương hiệu", "Danh mục", "Đơn vị", "Giá bán (VND)", "Tồn khả dụng", "Ngưỡng cảnh báo", "Trạng thái"],
    rows: rows.map((row) => [
      row.sku, row.code, row.name, row.brand, row.categories.map((category) => category.path).join("; "), row.unit,
      row.price, row.available, row.threshold, productStatusLabels[row.status],
    ]),
  };
}

/** "08/11/2026 14:05" in Vietnam time, so the file reads the same wherever it is opened. */
export function exportDateTime(value: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

const channelLabels = { online: "Trực tuyến", offline: "Tại cửa hàng" } as const;

/** Order list columns. Names and phones are customer-entered, so the CSV helper guards them against formulas. */
export function orderSection(rows: AdminOrderExportRow[]): ExportSection {
  return {
    headers: ["Mã đơn", "Ngày tạo", "Kênh", "Khách hàng", "Số điện thoại", "Thanh toán", "Trạng thái thanh toán", "Tạm tính (VND)", "Giảm giá (VND)", "Tổng tiền (VND)", "Mã voucher", "Trạng thái đơn"],
    rows: rows.map((row) => [
      row.orderCode, exportDateTime(row.createdAt), channelLabels[row.channel], row.customerName, row.phone,
      paymentMethodLabels[row.paymentMethod] ?? row.paymentMethod, row.paymentStatus ? paymentStatusLabels[row.paymentStatus] : "",
      row.subtotal, row.discount, row.total, row.promotionCode ?? "", orderStatusLabels[row.status] ?? row.status,
    ]),
  };
}
