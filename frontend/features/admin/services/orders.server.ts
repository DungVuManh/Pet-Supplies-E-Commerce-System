import "server-only";
import { serverGet } from "@/lib/server-api";
import type { AdminOrderDetail } from "../types";

/** Renders the not-found page for an unknown code; call it inside a Suspense child. */
export function getOrder(orderCode: string) {
  return serverGet<AdminOrderDetail>(`/api/v1/admin/orders/${encodeURIComponent(orderCode)}`);
}
