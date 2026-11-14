import "server-only";
import { serverGet } from "@/lib/server-api";
import type { MasterDataDetail } from "../types";

/** Renders the not-found page for an unknown code; call it inside a Suspense child. */
export function getBrand(code: string) {
  return serverGet<MasterDataDetail>(`/api/v1/admin/master-data/brand/${encodeURIComponent(code)}`);
}
