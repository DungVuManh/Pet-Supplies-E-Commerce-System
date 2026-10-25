// =============================================================
// features/catalog/components/listProduct/hooks/use-product-list.ts
// Hook quản lý toàn bộ state, logic lọc và dùng useEffect để fetch API
// =============================================================

import { useEffect, useState } from "react";
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
  brands: [],
  priceRanges: [],
  sort: "default",
  page: 1,
};

export function useProductList() {
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
  const [filter, setFilter] = useState<CatalogFilter>(DEFAULT_FILTER);
  const [searchInput, setSearchInput] = useState("");


  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        console.log("[useProductList - useEffect] Đang tải danh mục & thương hiệu...");
        setLoadingFilters(true);

        const [categoriesRes, brandsRes] = await Promise.all([
          getCategoriesApi(),
          getBrandsApi(),
        ]);

        setCategories(categoriesRes.data.categories);
        setBrands(brandsRes.data.brands);
        console.log("[useProductList - useEffect] Tải danh mục & thương hiệu thành công!");
      } catch (err) {
        console.error("[useProductList - useEffect] Lỗi tải filter options:", err);
      } finally {
        setLoadingFilters(false);
      }
    }

    fetchFilterOptions();
  }, []);

 
  useEffect(() => {
    async function fetchProductList() {
      try {
        console.log("[useProductList - useEffect] Đang tải sản phẩm với filter:", filter);
        setLoadingProducts(true);
        setError(null);

        const res = await getProductsApi(filter);

        setProducts(res.data.products);
        setPagination(res.data.pagination);
        console.log(
          `[useProductList - useEffect] Nhận được ${res.data.products.length} sản phẩm thành công!`
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Có lỗi xảy ra khi tải sản phẩm";
        console.error("[useProductList - useEffect] Lỗi khi tải sản phẩm:", err);
        setError(msg);
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchProductList();
  }, [filter]); 
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[useProductList - useEffect] Cập nhật từ khóa tìm kiếm:", searchInput);
      setFilter((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  
  function handleCategoryChange(slug: string) {
    console.log("[useProductList] Chọn danh mục:", slug);
    setFilter((prev) => ({ ...prev, category: slug, page: 1 }));
  }

  function handlePriceRangeChange(range: string) {
    setFilter((prev) => {
      const exists = prev.priceRanges.includes(range);
      const nextRanges = exists
        ? prev.priceRanges.filter((r) => r !== range)
        : [...prev.priceRanges, range];
      console.log("[useProductList] Khoảng giá mới:", nextRanges);
      return { ...prev, priceRanges: nextRanges, page: 1 };
    });
  }

  function handleBrandChange(brand: string) {
    setFilter((prev) => {
      const exists = prev.brands.includes(brand);
      const nextBrands = exists
        ? prev.brands.filter((b) => b !== brand)
        : [...prev.brands, brand];
      console.log("[useProductList] Thương hiệu mới:", nextBrands);
      return { ...prev, brands: nextBrands, page: 1 };
    });
  }

  function handleSortChange(sort: string) {
    console.log("[useProductList] Sắp xếp theo:", sort);
    setFilter((prev) => ({ ...prev, sort, page: 1 }));
  }

  function handleDeleteFilter() {
    console.log("[useProductList] Xóa bộ lọc về mặc định");
    setSearchInput("");
    setFilter(DEFAULT_FILTER);
  }

  function handlePageChange(page: number) {
    console.log("[useProductList] Đổi trang:", page);
    setFilter((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    handleBrandChange,
    handleSortChange,
    handleDeleteFilter,
    handlePageChange,
  };
}
