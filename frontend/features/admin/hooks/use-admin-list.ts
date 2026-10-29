"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useListState } from "@/components/workspace/use-list-state";
import type { ListStateKind } from "@/components/workspace/workspace-ui";
import { ApiError, type QueryValue } from "@/lib/api-client";
import type { ListCounts, Page } from "../types";

export type ListFilter = Record<string, QueryValue>;
export type ListLoader<F extends ListFilter, T, C extends ListCounts> =
  (query: F & { page: number; pageSize: number }, signal: AbortSignal) => Promise<Page<T, C>>;

type Result<T, C extends ListCounts> = { key: string; data?: Page<T, C>; error?: ApiError };

/**
 * Filters, paging, and loading state for an Admin list screen. `load` is a
 * module-level service function, so its identity is stable. The form edits
 * `draft`; `submit` or `apply` makes it the active `filter` and returns to page 1.
 * `state` drives the designed `ListState` bodies, and `?state=` overrides it for review.
 */
export function useAdminList<F extends ListFilter, T, C extends ListCounts = ListCounts>(
  load: ListLoader<F, T, C>,
  initial: F,
  { pageSize = 6 }: { pageSize?: number } = {},
) {
  const reviewState = useListState();
  const [filter, setFilter] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T, C>>();

  // A request belongs to one key; anything else in `result` is stale, so loading is derived.
  const key = JSON.stringify([filter, page, pageSize, attempt]);
  useEffect(() => {
    const controller = new AbortController();
    load({ ...filter, page, pageSize }, controller.signal).then(
      (data) => setResult({ key, data }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key, error: error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Đã có lỗi xảy ra. Vui lòng thử lại.") });
      },
    );
    return () => controller.abort();
  }, [load, key, filter, page, pageSize]);

  const current = result?.key === key ? result : undefined;
  const loading = !current;
  // Keep the previous page on screen while the next one loads.
  const data = current?.data ?? result?.data;
  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page, pageSize, total: 0, totalPages: 0 };
  const error = current?.error ?? null;
  const state: ListStateKind | null = reviewState
    ?? (error ? "error" : loading && !data ? "loading" : !loading && items.length === 0 ? "empty" : null);

  function apply(next: F) {
    setFilter(next);
    setDraft(next);
    setPage(1);
  }

  return {
    filter, draft, setDraft, apply,
    /** Form submit handler that applies the draft. */
    submit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      apply(draft);
    },
    reset: () => apply(initial),
    page, setPage,
    reload: () => setAttempt((value) => value + 1),
    items, counts: data?.counts, pagination,
    /** First and last row numbers on this page, for `Pagination`. */
    from: items.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0,
    to: (pagination.page - 1) * pagination.pageSize + items.length,
    loading, error, state,
  };
}
