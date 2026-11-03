"use client";

import { control } from "@/components/workspace/workspace-ui";
import { useOverviewPeriod } from "../hooks/use-overview-period";
import { overviewPresets, parseOverviewPreset } from "../overview";
import type { OverviewPreset } from "../types";

export function OverviewPeriodSelect({ current }: { current: OverviewPreset }) {
  const { preset, pending, select } = useOverviewPeriod(current);
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor="overview-period" className="text-xs font-semibold">Kỳ báo cáo</label>
    <select id="overview-period" className={control} value={preset} aria-busy={pending}
      onChange={(event) => select(parseOverviewPreset(event.target.value))}>
      {overviewPresets.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>;
}
