"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import type { OverviewPreset } from "../types";

/** The period lives in the URL; the server reloads the data and the select shows the choice meanwhile. */
export function useOverviewPeriod(current: OverviewPreset) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preset, setPreset] = useOptimistic(current);

  function select(next: OverviewPreset) {
    startTransition(() => {
      setPreset(next);
      router.replace(`/admin/dashboard?period=${next}`, { scroll: false });
    });
  }

  return { preset, pending, select };
}
