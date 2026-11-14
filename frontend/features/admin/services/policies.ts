import { apiGet, apiSend } from "@/lib/api-client";
import type { StorePolicy, UpdatePolicyPayload } from "../types";

export function listPolicies(signal?: AbortSignal) {
  return apiGet<StorePolicy[]>("/api/v1/admin/policies", undefined, { signal });
}

export function getPolicy(code: string, signal?: AbortSignal) {
  return apiGet<StorePolicy>(`/api/v1/admin/policies/${encodeURIComponent(code)}`, undefined, { signal });
}

export function updatePolicy(code: string, payload: UpdatePolicyPayload) {
  return apiSend<StorePolicy>("PUT", `/api/v1/admin/policies/${encodeURIComponent(code)}`, payload);
}
