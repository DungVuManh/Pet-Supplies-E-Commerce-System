import "server-only";
import { serverGet } from "@/lib/server-api";
import type { AdminOverview, OverviewPreset } from "../types";

export function getOverview(preset: OverviewPreset) {
  return serverGet<AdminOverview>("/api/v1/admin/overview", { preset });
}
