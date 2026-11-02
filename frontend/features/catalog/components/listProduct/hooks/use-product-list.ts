// =============================================================
// features/catalog/components/listProduct/hooks/use-product-list.ts
// Hook quản lý toàn bộ state, logic lọc và dùng useEffect để fetch API
// Đã tối ưu triệt để: chống re-render vô tận, AbortController, useCallback
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
 getBrandsApi,
 getCategoriesApi,
 getProductsApi,
} from "../services/catalog.service";
import type {
 CatalogCategory,
 CatalogFilter,
 CatalogProduct,
 Pagination,
} from "../types";

const DEFAULT_FILTER: CatalogFilter = {
 search: "",
 category: "all",
 petType: "all",
 brands: [],
 priceRanges: [],
 sort: "default",
 page: 1,
 limit: 20,
};

export function useProductList(
  defaultCategory?: string,
  defaultPetType?: string,
  defaultSearch?: string
) {
  const searchParams = useSearchParams();
  // Ưu tiên: defaultCategory (từ server) → URL param → "all"
  const categoryParam = defaultCategory || searchParams?.get("category") || "all";
  const petTypeParam = (defaultPetType || searchParams?.get("petType") || "all") as "dog" | "cat" | "all";
  const searchParam = defaultSearch ?? searchParams?.get("q") ?? searchParams?.get("search") ?? "";

  // 1. State lưu dữ liệu trả về từ API
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // 2. State trạng thái loading & error
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. State quản lý bộ lọc và ô tìm kiếm
  const [filter, setFilter] = useState<CatalogFilter>(() => ({
    ...DEFAULT_FILTER,
    category: categoryParam,
    petType: petTypeParam,
    search: searchParam,
  }));
  const [searchInput, setSearchInput] = useState(searchParam);

  // Ref lưu trữ AbortController của request fetch sản phẩm
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Khi URL thay đổi (navigate từ menu / filter / search), sync filter theo params mới
    setFilter((prev) => {
      if (
        prev.category === categoryParam &&
        prev.petType === petTypeParam &&
        prev.search === searchParam
      ) {
        return prev;
      }
      return {
        ...prev,
        category: categoryParam,
        petType: petTypeParam,
        search: searchParam,
        page: 1,
      };
    });
    setSearchInput(searchParam);
  }, [categoryParam, petTypeParam, searchParam]);

 useEffect(() => {
  let active = true;

  async function fetchFilterOptions() {
   try {
    setLoadingFilters(true);

    const [categoriesRes, brandsRes] = await Promise.all([
     getCategoriesApi(petTypeParam !== "all" ? petTypeParam : undefined),
     getBrandsApi(),
    ]);

    if (!active) return;

    let fetchedCategories = categoriesRes.data.categories;
    if (petTypeParam === "dog") {
      fetchedCategories = fetchedCategories.filter((c) => {
        if (c.petType) return c.petType === "dog" || c.petType === "both";
        const s = c.slug.toLowerCase();
        const n = c.name.toLowerCase();
        if (s.includes("-meo") || n.includes("cho mèo") || n.includes("cho meo")) {
          if (!s.includes("sua-cho-cho-meo")) return false;
        }
        return true;
      });
    } else if (petTypeParam === "cat") {
      fetchedCategories = fetchedCategories.filter((c) => {
        if (c.petType) return c.petType === "cat" || c.petType === "both";
        const s = c.slug.toLowerCase();
        const n = c.name.toLowerCase();
        if (
          s.endsWith("-cho") ||
          s.includes("-cho-cho") ||
          n.includes("cho chó") ||
          n.includes("cho cho")
        ) {
          if (!s.includes("sua-cho-cho-meo")) return false;
        }
        return true;
      });
    }
    setCategories(fetchedCategories);
    setBrands(brandsRes.data.brands);
   } catch (err) {
    console.error("[useProductList - useEffect] Lỗi tải filter options:", err);
   } finally {
    if (active) {
     setLoadingFilters(false);
    }
   }
  }

  fetchFilterOptions();

  return () => {
   active = false;
  };
 }, [petTypeParam]);

 useEffect(() => {
  // Hủy request trước đó nếu còn đang pending
  if (abortControllerRef.current) {
   abortControllerRef.current.abort();
  }
  const controller = new AbortController();
  abortControllerRef.current = controller;

  async function fetchProductList() {
   try {
    setLoadingProducts(true);
    setError(null);

    const res = await getProductsApi(filter, controller.signal);

    if (!controller.signal.aborted) {
     setProducts(res.data.products);
     setPagination(res.data.pagination);
    }
   } catch (err: unknown) {
    if ((err as Error)?.name !== "AbortError") {
     const msg =
      err instanceof Error ? err.message : "Có lỗi xảy ra khi tải sản phẩm";
     console.error("[useProductList - useEffect] Lỗi khi tải sản phẩm:", err);
     setError(msg);
    }
   } finally {
    if (!controller.signal.aborted) {
     setLoadingProducts(false);
    }
   }
  }

  fetchProductList();

  return () => {
   controller.abort();
  };
 }, [filter]);

 useEffect(() => {
  const timer = setTimeout(() => {
   setFilter((prev) => {
    // Chỉ cập nhật filter nếu từ khóa tìm kiếm thực sự thay đổi
    if (prev.search === searchInput) return prev;
    return { ...prev, search: searchInput, page: 1 };
   });
  }, 400);

  return () => clearTimeout(timer);
 }, [searchInput]);

 const handleCategoryChange = useCallback((slug: string) => {
  setFilter((prev) => (prev.category === slug ? prev : { ...prev, category: slug, page: 1 }));
 }, []);

 const handlePriceRangeChange = useCallback((range: string) => {
  setFilter((prev) => {
   const exists = prev.priceRanges.includes(range);
   const nextRanges = exists
    ? prev.priceRanges.filter((r) => r !== range)
    : [...prev.priceRanges, range];
   return { ...prev, priceRanges: nextRanges, page: 1 };
  });
 }, []);

 const handlePriceChange = useCallback((min: number, max: number) => {
  setFilter((prev) => {
   if (prev.minPrice === min && prev.maxPrice === max) return prev;
   return { ...prev, minPrice: min, maxPrice: max, page: 1 };
  });
 }, []);

 const handleBrandChange = useCallback((brand: string) => {
  setFilter((prev) => {
   const exists = prev.brands.includes(brand);
   const nextBrands = exists
    ? prev.brands.filter((b) => b !== brand)
    : [...prev.brands, brand];
   return { ...prev, brands: nextBrands, page: 1 };
  });
 }, []);

 const handleSortChange = useCallback((sort: string) => {
  setFilter((prev) => (prev.sort === sort ? prev : { ...prev, sort, page: 1 }));
 }, []);

 const handleDeleteFilter = useCallback(() => {
  setSearchInput("");
  setFilter({
   ...DEFAULT_FILTER,
   petType: petTypeParam,
  });
 }, [petTypeParam]);

 const handlePageChange = useCallback((page: number) => {
  setFilter((prev) => (prev.page === page ? prev : { ...prev, page }));
  window.scrollTo({ top: 0, behavior: "smooth" });
 }, []);

 return {
  // Data
  products,
  categories,
  brands,
  pagination,
  filter,
  searchInput,
  // Trạng thái
  loadingProducts,
  loadingFilters,
  error,
  // Hành động
  setSearchInput,
  handleCategoryChange,
  handlePriceRangeChange,
  handlePriceChange,
  handleBrandChange,
  handleSortChange,
  handleDeleteFilter,
  handlePageChange,
 };
}
