"use client";

// =============================================================
// features/catalog/components/listProduct/components/filter-sidebar.tsx
// UI component: Sidebar bộ lọc danh mục, thương hiệu, khoảng giá
// Thiết kế đồng bộ với theme Blue/Brand, thanh trượt giá tương tác hai đầu
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Search } from "lucide-react";
import type { CatalogCategory } from "../types";

const MAX_PRICE_LIMIT = 10000000;
const PRICE_STEP = 50000;

function formatVnd(amount: number): string {
 if (amount === 0) return "0đ";
 return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

type FilterSidebarProps = {
 categories: CatalogCategory[];
 brands: string[];
 selectedCategory: string;
 selectedPrices?: string[];
 minPrice?: number;
 maxPrice?: number;
 selectedBrands: string[];
 loadingFilters: boolean;
 onCategoryChange: (slug: string) => void;
 onPriceRangeChange?: (value: string) => void;
 onPriceChange?: (min: number, max: number) => void;
 onBrandChange: (brand: string) => void;
 onDeleteFilter: () => void;
};

export function FilterSidebar({
 categories,
 brands,
 selectedCategory,
 minPrice = 0,
 maxPrice = MAX_PRICE_LIMIT,
 selectedBrands,
 loadingFilters,
 onCategoryChange,
 onPriceChange,
 onBrandChange,
 onDeleteFilter,
}: FilterSidebarProps) {
 const [categoryOpen, setCategoryOpen] = useState(true);
 const [brandOpen, setBrandOpen] = useState(true);
 const [priceOpen, setPriceOpen] = useState(true);
 const [brandSearch, setBrandSearch] = useState("");

 // Quản lý giá trị cục bộ của thanh trượt giá
 const [localMin, setLocalMin] = useState(minPrice);
 const [localMax, setLocalMax] = useState(maxPrice);

 // Đồng bộ lại khi prop minPrice / maxPrice từ ngoài thay đổi (ví dụ khi nhấn Xóa lọc)
 useEffect(() => {
  setLocalMin(minPrice);
 }, [minPrice]);

 useEffect(() => {
  setLocalMax(maxPrice);
 }, [maxPrice]);

 // Debounce gọi onPriceChange để không spam API khi người dùng đang kéo thanh trượt
 useEffect(() => {
  const timer = setTimeout(() => {
   if (localMin !== minPrice || localMax !== maxPrice) {
    onPriceChange?.(localMin, localMax);
   }
  }, 350);

  return () => clearTimeout(timer);
 }, [localMin, localMax, minPrice, maxPrice, onPriceChange]);

 const deduplicatedCategories = useMemo(() => {
  const seen = new Set<string>();
  const unique: CatalogCategory[] = [];
  for (const cat of categories) {
   const norm = cat.name.trim().toLowerCase();
   if (!seen.has(norm)) {
    seen.add(norm);
    unique.push(cat);
   }
  }
  return unique;
 }, [categories]);

 const filteredBrands = useMemo(() => {
  if (!brandSearch.trim()) return brands;
  const query = brandSearch.trim().toLowerCase();
  return brands.filter((brand) => brand.toLowerCase().includes(query));
 }, [brands, brandSearch]);

 const isPriceActive = localMin > 0 || localMax < MAX_PRICE_LIMIT;
 const hasActiveFilters =
  (selectedCategory && selectedCategory !== "all") ||
  selectedBrands.length > 0 ||
  isPriceActive;

 const minPercent = Math.min(
  100,
  Math.max(0, (localMin / MAX_PRICE_LIMIT) * 100),
 );
 const maxPercent = Math.min(
  100,
  Math.max(0, (localMax / MAX_PRICE_LIMIT) * 100),
 );

 return (
  <aside className="w-1/5 shrink-0 rounded-2xl p-2 bg-white   select-none sticky top-4 self-start">
   {/* Header bộ lọc và nút xóa */}
   {hasActiveFilters && (
    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
     <span className="text-xs font-medium text-gray-500">
      Đang áp dụng bộ lọc
     </span>
     <button
      type="button"
      onClick={onDeleteFilter}
      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
     >
      <RotateCcw className="w-3.5 h-3.5" />
      Xóa lọc
     </button>
    </div>
   )}

   {/* 1. Phần Danh mục */}
   <div>
    <button
     type="button"
     onClick={() => setCategoryOpen(!categoryOpen)}
     className="w-full flex items-center justify-between text-left font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors cursor-pointer"
    >
     <span>Danh mục</span>
     {categoryOpen ? (
      <ChevronUp className="w-4 h-4 text-gray-400" />
     ) : (
      <ChevronDown className="w-4 h-4 text-gray-400" />
     )}
    </button>

    {categoryOpen && (
     <div className="mt-3">
      {/* Nút tất cả sản phẩm */}
      <button
       type="button"
       onClick={() => onCategoryChange("all")}
       className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
        selectedCategory === "all"
         ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100/60"
         : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
       }`}
      >
       Tất cả sản phẩm
      </button>

      {/* Danh sách các danh mục - Cuộn mượt khi danh sách dài */}
      <div className="mt-1 max-h-64 overflow-y-auto pr-1 space-y-0.5 [scrollbar-width:thin]">
       {loadingFilters ? (
        <div className="py-2 px-3 text-xs text-gray-400">
         Đang tải danh mục...
        </div>
       ) : (
        deduplicatedCategories.map((cat) => {
         const isSelected = selectedCategory === cat.slug;
         return (
          <button
           key={cat._id}
           type="button"
           onClick={() => onCategoryChange(cat.slug)}
           className={`w-full text-left px-3.5 py-2 rounded-xl text-sm transition-all duration-150 cursor-pointer flex items-center justify-between ${
            isSelected
             ? "bg-blue-50 text-[#0B4DFF] font-bold border border-blue-200/80 shadow-xs"
             : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
           }`}
          >
           <span>{cat.name}</span>
           {isSelected && (
            <span className="size-1.5 rounded-full bg-[#0B4DFF] shrink-0" />
           )}
          </button>
         );
        })
       )}
      </div>
     </div>
    )}
   </div>

   <div className="my-4 border-t border-gray-100" />

   {/* 2. Phần Thương hiệu */}
   <div>
    <button
     type="button"
     onClick={() => setBrandOpen(!brandOpen)}
     className="w-full flex items-center justify-between text-left font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors cursor-pointer"
    >
     <span>Thương hiệu</span>
     {brandOpen ? (
      <ChevronUp className="w-4 h-4 text-gray-400" />
     ) : (
      <ChevronDown className="w-4 h-4 text-gray-400" />
     )}
    </button>

    {brandOpen && (
     <div className="mt-3">
      {/* Ô tìm kiếm thương hiệu */}
      <div className="relative mb-2.5">
       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
       <input
        type="text"
        placeholder="Tìm thương hiệu..."
        value={brandSearch}
        onChange={(e) => setBrandSearch(e.target.value)}
        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-800 placeholder:text-gray-400"
       />
      </div>

      {/* Danh sách thương hiệu - Cuộn mượt khi danh sách dài */}
      <div className="max-h-60 overflow-y-auto pr-1 space-y-1.5 [scrollbar-width:thin]">
       {loadingFilters ? (
        <div className="py-2 px-1 text-xs text-gray-400">
         Đang tải thương hiệu...
        </div>
       ) : filteredBrands.length === 0 ? (
        <div className="py-2 px-1 text-xs text-gray-400">
         Không tìm thấy thương hiệu
        </div>
       ) : (
        filteredBrands.map((brand) => {
         const isChecked = selectedBrands.includes(brand);
         return (
          <div
           key={brand}
           onClick={() => onBrandChange(brand)}
           className="group flex items-center gap-2.5 px-1 py-1 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          >
           <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
             isChecked
              ? "border-blue-600 bg-blue-600"
              : "border-gray-300 group-hover:border-blue-500"
            }`}
           >
            {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
           </div>
           <span
            className={`text-sm flex-1 truncate ${
             isChecked ? "font-semibold text-blue-900" : "text-gray-700"
            }`}
           >
            {brand}
           </span>
          </div>
         );
        })
       )}
      </div>
     </div>
    )}
   </div>

   <div className="my-4 border-t border-gray-100" />

   {/* 3. Phần Khoảng giá (Thanh trượt tương tác hai đầu) */}
   <div>
    <button
     type="button"
     onClick={() => setPriceOpen(!priceOpen)}
     className="w-full flex items-center justify-between text-left font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors cursor-pointer"
    >
     <span>Khoảng giá</span>
     {priceOpen ? (
      <ChevronUp className="w-4 h-4 text-gray-400" />
     ) : (
      <ChevronDown className="w-4 h-4 text-gray-400" />
     )}
    </button>

    {priceOpen && (
     <div className="mt-3">
      {/* Thanh trượt khoảng giá tương tác */}
      <div className="relative w-full h-8 flex items-center select-none">
       {/* Thanh nền */}
       <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />

       {/* Vùng chọn giá tích cực */}
       <div
        className="absolute h-1.5 bg-blue-600 rounded-full pointer-events-none"
        style={{
         left: `${minPercent}%`,
         width: `${Math.max(0, maxPercent - minPercent)}%`,
        }}
       />

       {/* Thumb kéo giá tối thiểu */}
       <input
        type="range"
        min={0}
        max={MAX_PRICE_LIMIT}
        step={PRICE_STEP}
        value={localMin}
        onChange={(e) => {
         const val = Math.min(Number(e.target.value), localMax - PRICE_STEP);
         setLocalMin(val);
        }}
        className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none cursor-pointer z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-xs [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-xs"
        aria-label="Giá tối thiểu"
       />

       {/* Thumb kéo giá tối đa */}
       <input
        type="range"
        min={0}
        max={MAX_PRICE_LIMIT}
        step={PRICE_STEP}
        value={localMax}
        onChange={(e) => {
         const val = Math.max(Number(e.target.value), localMin + PRICE_STEP);
         setLocalMax(val);
        }}
        className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none cursor-pointer z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-xs [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:shadow-xs"
        aria-label="Giá tối đa"
       />
      </div>

      {/* Mức giá hiển thị hai đầu */}
      <div className="flex justify-between text-[11px] text-gray-500 font-medium px-0.5">
       <span>{formatVnd(localMin)}</span>
       <span>{formatVnd(localMax)}</span>
      </div>

      {/* Hiển thị chi tiết khoảng giá đang chọn */}
      {isPriceActive && (
       <div className="mt-2.5 flex items-center justify-between text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
        <span>Khoảng giá:</span>
        <span className="font-semibold">
         {formatVnd(localMin)} - {formatVnd(localMax)}
        </span>
       </div>
      )}
     </div>
    )}
   </div>
  </aside>
 );
}
