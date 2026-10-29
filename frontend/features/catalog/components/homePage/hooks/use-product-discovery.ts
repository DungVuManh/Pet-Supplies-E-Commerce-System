"use client";

// =============================================================
// features/catalog/components/homePage/hooks/use-product-discovery.ts
// Hook quản lý logic tải sản phẩm, tab lọc và trạng thái loading
// =============================================================

import { useEffect, useState } from "react";
import type { Product } from "@/features/catalog/products";
import { fetchHomeProductsApi } from "../services/home.service";
import type { HomeTab } from "../types";

export const HOME_TABS: readonly HomeTab[] = [
  { id: "all", label: "Tất cả" },
  { id: "dog", label: "🐕 Dành cho Chó " },
  { id: "cat", label: "🐈 Dành cho Mèo" },
  { id: "new", label: "✨ Hàng mới về" },
] as const;

export function useProductDiscovery(query = "", category = "") {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    async function loadProducts() {
      try {
        const data = await fetchHomeProductsApi(
          { query, category, activeTab },
          controller.signal
        );
        setProducts(data);
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          // Khi API có lỗi hoặc chưa có sản phẩm, trả về mảng rỗng
          setProducts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      controller.abort();
    };
  }, [query, category, activeTab]);

  return {
    activeTab,
    setActiveTab,
    products,
    isLoading,
    tabs: HOME_TABS,
  };
}
