import { apiGet } from "@/lib/api-client";
import type { AdminOrderExportRow, AdminOrderRow, ExportPage, OrderCounts, OrderFilter, Page } from "../types";

export function listOrders(query: OrderFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminOrderRow, OrderCounts>>("/api/v1/admin/orders", query, { signal });
}

/** Every order the list would show for this filter, across pages, up to the server's limit. */
export function exportOrders(filter: OrderFilter) {
  return apiGet<ExportPage<AdminOrderExportRow>>("/api/v1/admin/orders/export", filter);
}
