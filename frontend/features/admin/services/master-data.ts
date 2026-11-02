import { apiGet } from "@/lib/api-client";
import type { MasterDataCounts, MasterDataFilter, MasterDataRow, Page } from "../types";

export function listMasterData(query: MasterDataFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<MasterDataRow, MasterDataCounts>>("/api/v1/admin/master-data", query, { signal });
}
