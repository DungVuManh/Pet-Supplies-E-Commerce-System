import { apiGet } from "@/lib/api-client";
import type { AdminOrderRow, OrderCounts, OrderFilter, Page } from "../types";

export function listOrders(query: OrderFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminOrderRow, OrderCounts>>("/api/v1/admin/orders", query, { signal });
}
