import type { BrandFilter, MasterDataDetail, MasterDataRow, Page } from "../types";
import { createMasterData, deleteMasterData, listMasterData, updateMasterData } from "./master-data";

// Brands are master data rows of kind `brand`; these wrap the master data API for the brand pages.

/** One page of brands; each row's `metric` is its product count. */
export function listBrands(query: BrandFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return listMasterData({ ...query, kind: "brand" }, signal) as Promise<Page<MasterDataRow>>;
}

export type BrandFields = { name?: string; description?: string; isActive?: boolean };

export function createBrand(fields: BrandFields) {
  return createMasterData("brand", fields);
}

export function updateBrand(code: string, edit: BrandFields & { expectedUpdatedAt: string }) {
  return updateMasterData("brand", code, edit);
}

export function deleteBrand(code: string) {
  return deleteMasterData("brand", code);
}

export type { MasterDataDetail as BrandDetail };
