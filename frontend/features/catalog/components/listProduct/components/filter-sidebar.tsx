"use client";

// =============================================================
// features/catalog/components/listProduct/components/filter-sidebar.tsx
// UI component: Sidebar bộ lọc danh mục, khoảng giá, thương hiệu
// =============================================================

import React from "react";
import type { CatalogCategory } from "../types";

const PRICE_RANGES = [
  { value: "under-100k", label: "Dưới 100.000đ" },
  { value: "100k-300k", label: "100.000đ - 300.000đ" },
  { value: "above-300k", label: "Trên 300.000đ" },
];

type FilterSidebarProps = {
  categories: CatalogCategory[];
  brands: string[];
  selectedCategory: string;
  selectedPrices: string[];
  selectedBrands: string[];
  loadingFilters: boolean;
  onCategoryChange: (slug: string) => void;
  onPriceRangeChange: (value: string) => void;
  onBrandChange: (brand: string) => void;
  onDeleteFilter: () => void;
};

export function FilterSidebar({
  categories,
  brands,
  selectedCategory,
  selectedPrices,
  selectedBrands,
  loadingFilters,
  onCategoryChange,
  onPriceRangeChange,
  onBrandChange,
  onDeleteFilter,
}: FilterSidebarProps) {
  return (
    <aside className="w-1/4 shrink-0 rounded-md p-4 bg-blue-50 mr-5">
      <div className="flex justify-between ">
        <h1 className="font-bold text-xl ">Bộ Lọc</h1>
        <button
          type="button"
          className="font-bold text-sm text-blue-600 hover:underline"
          onClick={onDeleteFilter}
        >
          Xóa lọc
        </button>
      </div>

      {/* Danh mục */}
      <h4 className="font-bold mt-3">Danh mục</h4>
      <ul>
        <li className="flex items-center gap-2 mt-3 font-medium">
          <input
            type="radio"
            id="cat-all"
            name="category"
            checked={selectedCategory === "all"}
            onChange={() => onCategoryChange("all")}
          />
          <label htmlFor="cat-all" className="cursor-pointer">
            Tất cả sản phẩm
          </label>
        </li>

        {loadingFilters ? (
          <li className="mt-3 text-sm text-gray-400">Đang tải danh mục...</li>
        ) : (
          categories.map((cat) => (
            <li
              key={cat._id}
              className="flex items-center gap-2 mt-3 font-medium"
            >
              <input
                type="radio"
                id={`cat-${cat.slug}`}
                name="category"
                checked={selectedCategory === cat.slug}
                onChange={() => onCategoryChange(cat.slug)}
              />
              <label htmlFor={`cat-${cat.slug}`} className="cursor-pointer">
                {cat.name}
              </label>
            </li>
          ))
        )}
      </ul>

      {/* Khoảng giá */}
      <h1 className="font-bold mt-5">Khoảng giá</h1>
      <ul>
        {PRICE_RANGES.map((range) => (
          <li
            key={range.value}
            className="flex items-center gap-2 mt-3 font-medium"
          >
            <input
              type="checkbox"
              id={`price-${range.value}`}
              checked={selectedPrices.includes(range.value)}
              onChange={() => onPriceRangeChange(range.value)}
            />
            <label htmlFor={`price-${range.value}`} className="cursor-pointer">
              {range.label}
            </label>
          </li>
        ))}
      </ul>

      {/* Thương hiệu */}
      <h1 className="font-bold mt-5">Thương hiệu</h1>
      <ul>
        {loadingFilters ? (
          <li className="mt-3 text-sm text-gray-400">Đang tải thương hiệu...</li>
        ) : (
          brands.map((brand) => (
            <li key={brand} className="flex items-center gap-2 mt-3 font-medium">
              <input
                type="checkbox"
                id={`brand-${brand}`}
                checked={selectedBrands.includes(brand)}
                onChange={() => onBrandChange(brand)}
              />
              <label htmlFor={`brand-${brand}`} className="cursor-pointer">
                {brand}
              </label>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
