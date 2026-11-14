"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listOrders } from "../services/orders";
import type { OrderFilter } from "../types";
import { useAdminList } from "./use-admin-list";

const SEARCH_DELAY_MS = 300;
const cleared: OrderFilter = { tab: "all", q: "", status: "all" };

/** Filters and paging for the Admin order list. `?q=` lets other screens open it searched for one order. */
export function useOrdersList() {
  const linkedQuery = useSearchParams().get("q") ?? "";
  const list = useAdminList(listOrders, { ...cleared, q: linkedQuery });
  const { apply, filter } = list;
  const [query, setQuery] = useState(linkedQuery);
  const [seenLink, setSeenLink] = useState(linkedQuery);

  // Next keeps this route mounted while hidden, so a new link has to replace the old search.
  if (seenLink !== linkedQuery) {
    setSeenLink(linkedQuery);
    setQuery(linkedQuery);
    apply({ ...cleared, q: linkedQuery });
  }

  // Filters apply as the Admin types, so wait for a pause before searching.
  useEffect(() => {
    if (query === filter.q) return;
    const timer = setTimeout(() => apply({ ...filter, q: query }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, filter, apply]);

  return {
    ...list,
    query,
    setQuery,
    selectTab: (tab: OrderFilter["tab"]) => apply({ ...filter, q: query, tab }),
    selectStatus: (status: OrderFilter["status"]) => apply({ ...filter, q: query, status }),
    clearFilters() {
      setQuery("");
      apply(cleared);
    },
  };
}
