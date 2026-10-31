"use client";

// =============================================================
// features/catalog/components/listProduct/components/product-pagination.tsx
// UI component: Thanh chuyển trang (trước, các trang số với dấu ..., sau)
// =============================================================

import React from "react";
import type { Pagination } from "../types";

type ProductPaginationProps = {
 pagination: Pagination | null;
 onPageChange: (page: number) => void;
};

function getPaginationItems(
 currentPage: number,
 totalPages: number,
): (number | string)[] {
 if (totalPages <= 7) {
  return Array.from({ length: totalPages }, (_, i) => i + 1);
 }

 // Ở gần đầu: 1 2 3 4 5 ... totalPages
 if (currentPage <= 4) {
  return [1, 2, 3, 4, 5, "...", totalPages];
 }

 // Ở gần cuối: 1 ... (totalPages - 4) ... totalPages
 if (currentPage >= totalPages - 3) {
  return [
   1,
   "...",
   totalPages - 4,
   totalPages - 3,
   totalPages - 2,
   totalPages - 1,
   totalPages,
  ];
 }

 // Ở giữa: 1 ... (c - 1) c (c + 1) ... totalPages
 return [
  1,
  "...",
  currentPage - 1,
  currentPage,
  currentPage + 1,
  "...",
  totalPages,
 ];
}

export function ProductPagination({
 pagination,
 onPageChange,
}: ProductPaginationProps) {
 if (!pagination || pagination.totalPages <= 1) {
  return null;
 }

 const items = getPaginationItems(
  pagination.currentPage,
  pagination.totalPages,
 );

 return (
  <nav
   aria-label="Phân trang sản phẩm"
   className="flex flex-wrap items-center justify-center gap-1.5 mt-8 mb-4"
  >
   {/* Nút Trước */}
   <button
    type="button"
    disabled={!pagination.hasPrevPage}
    onClick={() => onPageChange(pagination.currentPage - 1)}
    className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
   >
    ← Trước
   </button>

   {/* Các nút số trang và dấu ... */}
   {items.map((item, idx) => {
    if (typeof item === "string") {
     return (
      <span
       key={`ellipsis-${idx}`}
       className="flex items-center justify-center min-w-9 px-2 py-2 text-sm text-gray-400 font-medium select-none"
      >
       ...
      </span>
     );
    }

    const isCurrent = item === pagination.currentPage;
    return (
     <button
      key={item}
      type="button"
      onClick={() => onPageChange(item)}
      aria-current={isCurrent ? "page" : undefined}
      className={`min-w-10 px-3.5 py-2 rounded-md border font-medium text-sm transition-colors ${
       isCurrent
        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
        : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
      }`}
     >
      {item}
     </button>
    );
   })}

   {/* Nút Sau */}
   <button
    type="button"
    disabled={!pagination.hasNextPage}
    onClick={() => onPageChange(pagination.currentPage + 1)}
    className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
   >
    Sau →
   </button>
  </nav>
 );
}
