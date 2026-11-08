import { apiGet, apiSend } from "@/lib/api-client";
import type { MasterDataCounts, MasterDataDetail, MasterDataFilter, MasterDataKind, MasterDataRow, Page } from "../types";

export function listMasterData(query: MasterDataFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<MasterDataRow, MasterDataCounts>>("/api/v1/admin/master-data", query, { signal });
}

const rowPath = (kind: MasterDataKind, code: string) => `/api/v1/admin/master-data/${kind}/${encodeURIComponent(code)}`;

export function getMasterData(kind: MasterDataKind, code: string, signal?: AbortSignal) {
  return apiGet<MasterDataDetail>(rowPath(kind, code), undefined, { signal });
}

/** The fields a row can have. `petTypeCode` is only for breeds and `fee` only for shipping methods. */
export type MasterDataFields = { name?: string; description?: string; isActive?: boolean; petTypeCode?: string; fee?: number };

export function createMasterData(kind: MasterDataKind, fields: MasterDataFields) {
  return apiSend<MasterDataDetail>("POST", "/api/v1/admin/master-data", { kind, ...fields });
}

/** The changed fields, plus the `updatedAt` the modal was loaded with. */
export function updateMasterData(kind: MasterDataKind, code: string, edit: MasterDataFields & { expectedUpdatedAt: string }) {
  return apiSend<MasterDataDetail & { changed: boolean }>("PATCH", rowPath(kind, code), edit);
}

export function deleteMasterData(kind: MasterDataKind, code: string) {
  return apiSend<{ kind: MasterDataKind; code: string }>("DELETE", rowPath(kind, code));
}
