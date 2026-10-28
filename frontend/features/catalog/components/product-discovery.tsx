"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { categories, filterProducts, type Product } from "../products";
import { CategoryCard } from "./category-card";
import { ProductCard } from "./listProduct/components/product-card";
import type { GetProductsResponse } from "./listProduct/types";

const TABS = [
 { id: "all", label: "Tất cả" },
 { id: "dog", label: "🐕 Dành cho Chó " },
 { id: "cat", label: "🐈 Dành cho Mèo" },
 { id: "new", label: "✨ Hàng mới về" },
] as const;

export function ProductDiscovery() {
 const params = useSearchParams();
 return (
  <ProductDiscoveryContent
   query={params.get("q") ?? ""}
   category={params.get("category") ?? ""}
  />
 );
}

export function ProductDiscoveryContent({
 query = "",
 category = "",
}: {
 query?: string;
 category?: string;
}) {
 const [activeTab, setActiveTab] = useState<string>("all");
 const [apiProducts, setApiProducts] = useState<Product[] | null>(null);
 const [isLoading, setIsLoading] = useState<boolean>(true);

 const selectedCategory = categories.find((item) => item.id === category);

 // Gọi API lấy danh sách sản phẩm từ backend MongoDB
 useEffect(() => {
  let isCancelled = false;
  setIsLoading(true);

  async function fetchProductsFromApi() {
   try {
    const searchParams = new URLSearchParams();
    searchParams.set("limit", "8");
    searchParams.set("page", "1");

    if (query.trim()) {
     searchParams.set("search", query.trim());
    }

    // Lọc theo loài thú cưng (petType)
    const effectivePetType =
     category === "dog" || activeTab === "dog"
      ? "dog"
      : category === "cat" || activeTab === "cat"
        ? "cat"
        : undefined;

    if (effectivePetType) {
     searchParams.set("petType", effectivePetType);
    }

    if (category && category !== "dog" && category !== "cat") {
     searchParams.set("category", category);
    }

    if (activeTab === "new") {
     searchParams.set("sort", "default");
    }

    const res = await fetch(
     `/api/v1/catalog/products?${searchParams.toString()}`,
     {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
     },
    );

    if (!res.ok) {
     throw new Error(`API error: ${res.status}`);
    }

    const data: GetProductsResponse = await res.json();
    if (!isCancelled) {
     if (
      data?.success &&
      Array.isArray(data.data?.products) &&
      data.data.products.length > 0
     ) {
      const mapped: Product[] = data.data.products.map((p) => ({
       id: p._id,
       name: p.name,
       brand: p.brand || "Petjoy",
       description: p.description || "",
       price: p.price,
       image:
        p.image ||
        p.images?.[0] ||
        "/images/products/royal-canin-mini-adult.png",
       categories: [],
       ratingAvg: p.ratingAvg,
       ratingCount: p.ratingCount,
       variants: p.variants?.map((v) => ({
        sku: v.sku,
        label: v.label,
        price: v.price,
        stock: v.stock,
       })),
      }));
      setApiProducts(mapped);
     } else {
      // Không có dữ liệu thì null để fallback
      setApiProducts(null);
     }
    }
   } catch {
    if (!isCancelled) {
     // Khi API chưa sẵn sàng hoặc lỗi, fallback về mock sample data
     setApiProducts(null);
    }
   } finally {
    if (!isCancelled) {
     setIsLoading(false);
    }
   }
  }

  void fetchProductsFromApi();

  return () => {
   isCancelled = true;
  };
 }, [query, category, activeTab]);

 // Fallback sang danh mục mẫu nếu API chưa có hoặc lỗi
 const fallback = filterProducts(query, category);
 const products = apiProducts !== null ? apiProducts : fallback;
 const isFiltered = Boolean(
  query.trim() || selectedCategory || activeTab !== "all",
 );

 return (
  <div className="flex flex-col gap-6">
   {/* 1. Mua sắm theo danh mục */}
   <section aria-label="Mua sắm theo danh mục" className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
     <h2 className="text-xl font-semibold text-ink sm:text-2xl">
      Mua sắm theo danh mục
     </h2>
     <Link
      href="/listProduct/allProducts"
      className="text-xs font-semibold text-brand hover:underline sm:text-sm"
     >
      Tất cả danh mục →
     </Link>
    </div>

    <nav
     aria-label="Danh mục sản phẩm"
     className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
     {categories.map((item) => {
      const params = new URLSearchParams({ category: item.id });
      if (query.trim()) params.set("q", query.trim());
      return (
       <CategoryCard
        key={item.id}
        {...item}
        href={`/?${params}#featured-products`}
        active={item.id === selectedCategory?.id}
       />
      );
     })}
    </nav>
   </section>

   {/* 2. Sản phẩm nổi bật (kết nối API) */}
   <section
    id="featured-products"
    aria-labelledby="products-title"
    className="scroll-mt-6"
   >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
     <div>
      <h2
       id="products-title"
       className="text-xl font-semibold leading-normal text-ink sm:text-2xl"
      >
       {query.trim()
        ? "Kết quả tìm kiếm"
        : (selectedCategory?.name ?? "Sản phẩm nổi bật")}
      </h2>
      <p className="mt-0.5 text-xs text-muted">
       Dinh dưỡng chính hãng & phụ kiện an toàn được chọn lọc kỹ lưỡng
      </p>
     </div>

     <Link
      href="/listProduct/allProducts"
      className="inline-flex min-h-6 items-center text-xs font-semibold text-brand hover:underline sm:text-sm"
     >
      Xem tất cả sản phẩm →
     </Link>
    </div>

    {/* Tabs lọc nhanh theo phong cách Paddy.vn */}
    {!query.trim() && (
     <div className="flex flex-wrap items-center gap-2 mb-4">
      {TABS.map((tab) => {
       const isActive = activeTab === tab.id && !category;
       return (
        <button
         key={tab.id}
         type="button"
         onClick={() => setActiveTab(tab.id)}
         className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
          isActive
           ? "bg-brand text-white shadow-xs"
           : "bg-surface border border-line text-ink hover:bg-canvas"
         }`}
        >
         {tab.label}
        </button>
       );
      })}
     </div>
    )}

    {isFiltered && (
     <p
      role="status"
      className="mb-4 break-words text-xs text-muted sm:text-sm"
     >
      {products.length} sản phẩm
      {query.trim() ? ` cho “${query.trim()}”` : ""}
      {selectedCategory ? ` · ${selectedCategory.name}` : ""}
      {activeTab !== "all" && !selectedCategory
       ? ` · ${TABS.find((t) => t.id === activeTab)?.label}`
       : ""}
     </p>
    )}

    {/* Trạng thái Skeleton Loading */}
    {isLoading ? (
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
       <div
        key={index}
        className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 animate-pulse"
       >
        <div className="h-44 w-full rounded-xl bg-canvas" />
        <div className="h-3 w-20 rounded bg-canvas" />
        <div className="h-4 w-3/4 rounded bg-canvas" />
        <div className="mt-auto flex items-center justify-between pt-2">
         <div className="h-5 w-24 rounded bg-canvas" />
         <div className="size-8 rounded-xl bg-canvas" />
        </div>
       </div>
      ))}
     </div>
    ) : products.length > 0 ? (
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
       <Link
        key={product.id}
        href={`/listProduct/detailProduct?id=${product.id}`}
        className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand"
       >
        <ProductCard product={product} />
       </Link>
      ))}
     </div>
    ) : (
     <div className="rounded-2xl border border-line bg-canvas px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-ink sm:text-lg">
       Chưa tìm thấy sản phẩm phù hợp
      </h3>
      <p className="mt-2 text-xs text-muted sm:text-sm">
       Thử từ khóa khác hoặc bấm nút bên dưới để xem toàn bộ danh mục sản phẩm.
      </p>
      <Link
       href="/listProduct/allProducts"
       className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover sm:text-sm"
      >
       Xem tất cả sản phẩm →
      </Link>
     </div>
    )}
   </section>
  </div>
 );
}
