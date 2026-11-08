import { productStatusLabels } from "../status.ts";
import type { AdminProductRow } from "../types";
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
