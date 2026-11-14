import { apiGet, apiSend } from "@/lib/api-client";
import type { StorePolicy, UpdatePolicyPayload } from "../types";

export type CreatePolicyPayload = {
  title: string;
  code?: string;
  slug?: string;
  content?: string;
  effectiveDate?: string;
};

export function listPolicies(signal?: AbortSignal) {
  return apiGet<StorePolicy[]>("/api/v1/admin/policies", undefined, { signal });
}

export function getPolicy(code: string, signal?: AbortSignal) {
  return apiGet<StorePolicy>(`/api/v1/admin/policies/${encodeURIComponent(code)}`, undefined, { signal });
}

export function createPolicy(payload: CreatePolicyPayload) {
  return apiSend<StorePolicy>("POST", "/api/v1/admin/policies", payload);
}

export function updatePolicy(code: string, payload: UpdatePolicyPayload) {
  return apiSend<StorePolicy>("PUT", `/api/v1/admin/policies/${encodeURIComponent(code)}`, payload);
}

export function deletePolicy(code: string) {
  return apiSend<{ code: string; id: string }>("DELETE", `/api/v1/admin/policies/${encodeURIComponent(code)}`);
}
