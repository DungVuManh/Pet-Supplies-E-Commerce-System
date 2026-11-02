"use client";

import { useSearchParams } from "next/navigation";
import type { ListStateKind } from "./workspace-ui";

const kinds: readonly ListStateKind[] = ["empty", "loading", "error"];

/** Review switch for designed list states (`?state=empty|loading|error`); `null` renders real data. */
export function useListState(): ListStateKind | null {
  const value = useSearchParams().get("state");
  return kinds.find((kind) => kind === value) ?? null;
}
