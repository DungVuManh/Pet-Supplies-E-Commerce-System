import { apiGet, apiSend } from "@/lib/api-client";
import type { CustomerNotificationsResponse } from "./types";

export async function fetchCustomerNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<CustomerNotificationsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.unreadOnly) query.set("unreadOnly", "true");

  const qs = query.toString();
  const url = `/api/v1/customer/notifications${qs ? `?${qs}` : ""}`;

  return await apiGet<CustomerNotificationsResponse>(url);
}

export async function markCustomerNotificationRead(id: string): Promise<void> {
  await apiSend("PATCH", `/api/v1/customer/notifications/${encodeURIComponent(id)}/read`, {});
}

export async function markAllCustomerNotificationsRead(): Promise<void> {
  await apiSend("POST", "/api/v1/customer/notifications/read-all");
}
