"use client";

import { useEffect, useState } from "react";
import { listCategories } from "../services/categories";
import { listProducts } from "../services/products";
import type { AdminCategoryRow, ProductFilter } from "../types";
import { useAdminList } from "./use-admin-list";

const initial: ProductFilter = { tab: "all", q: "", category: "all", status: "all" };

/** Filters and paging for the Admin product list, plus the category filter's options. */
export function useProductsList() {
  const list = useAdminList(listProducts, initial);
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    listCategories({ q: "", status: "all", page: 1, pageSize: 100 }, controller.signal).then(
      (data) => setCategories(data.items),
      // The list still works without its category filter options.
      () => {},
    );
    return () => controller.abort();
  }, []);

  return { ...list, categories };
}
