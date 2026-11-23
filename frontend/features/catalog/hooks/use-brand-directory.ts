import { useEffect, useState } from "react";
import { getBrandsApi } from "../components/listProduct/services/catalog.service";
import type { CatalogBrand } from "../components/listProduct/types";

export const brandLetters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

type DirectoryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; brands: CatalogBrand[] };

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
}

export function useBrandDirectory() {
  const [state, setState] = useState<DirectoryState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBrands() {
      try {
        const response = await getBrandsApi(controller.signal);
        if (!response.success || !Array.isArray(response.data?.brandDetails)) {
          throw new Error("Invalid catalog brand response");
        }
        if (!controller.signal.aborted) {
          setState({ status: "ready", brands: response.data.brandDetails });
        }
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }

    void loadBrands();
    return () => controller.abort();
  }, [attempt]);

  const brands = state.status === "ready" ? state.brands : [];
  const featured = [...brands]
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name, "vi"))
    .slice(0, 8);
  const groups = new Map<string, CatalogBrand[]>();
  const availableLetters = new Set<string>();
  const words = normalizeName(query).split(/\s+/);

  for (const brand of brands) {
    const name = normalizeName(brand.name);
    const firstLetter = name.charAt(0).toUpperCase();
    const group = brandLetters.includes(firstLetter) ? firstLetter : "#";
    availableLetters.add(group);

    if ((!letter || letter === group) && words.every((word) => name.includes(word))) {
      const matches = groups.get(group) ?? [];
      matches.push(brand);
      groups.set(group, matches);
    }
  }

  function retry() {
    setState({ status: "loading" });
    setAttempt((previous) => previous + 1);
  }

  function clearFilters() {
    setQuery("");
    setLetter("");
  }

  return {
    status: state.status,
    count: brands.length,
    featured,
    groups,
    availableLetters,
    query,
    setQuery,
    letter,
    setLetter,
    clearFilters,
    retry,
  };
}
