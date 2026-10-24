"use client";

// =============================================================
// features/catalog/components/listProduct/components/product-toolbar.tsx
// UI component: Thanh công cụ gồm ô tìm kiếm, số lượng và dropdown sắp xếp
// =============================================================

import React from "react";

type ProductToolbarProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  totalProducts: number;
  loadingProducts: boolean;
  sort: string;
  onSortChange: (sort: string) => void;
};

export function ProductToolbar({
  searchInput,
  onSearchChange,
  totalProducts,
  loadingProducts,
  sort,
  onSortChange,
}: ProductToolbarProps) {
  return (
    <div className="flex justify-between gap-4 mb-4 items-center">
      <input
        type="search"
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Tìm kiếm sản phẩm..."
        className="min-w-0 flex-1 rounded-md border p-2"
      />
      <h2 className="mr-5 ml-5 shrink-0 text-sm font-medium">
        {loadingProducts ? "Đang tải..." : `${totalProducts} sản phẩm`}
      </h2>
      <select
        className="rounded-md bg-white border p-2 text-sm"
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="default">Phổ biến nhất</option>
        <option value="price-asc">Giá: Thấp đến Cao</option>
        <option value="price-desc">Giá: Cao đến Thấp</option>
        <option value="name-asc">Tên: A-Z</option>
        <option value="name-desc">Tên: Z-A</option>
      </select>
    </div>
  );
}
