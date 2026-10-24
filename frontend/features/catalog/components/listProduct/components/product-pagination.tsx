"use client";

// =============================================================
// features/catalog/components/listProduct/components/product-pagination.tsx
// UI component: Thanh chuyển trang (trước, các trang số, sau)
// =============================================================

import React from "react";
import type { Pagination } from "../types";

type ProductPaginationProps = {
  pagination: Pagination | null;
  onPageChange: (page: number) => void;
};

export function ProductPagination({
  pagination,
  onPageChange,
}: ProductPaginationProps) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-center gap-2 mt-8">
      {/* Nút Trước */}
      <button
        type="button"
        disabled={!pagination.hasPrevPage}
        onClick={() => onPageChange(pagination.currentPage - 1)}
        className="px-4 py-2 rounded-md border font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        ← Trước
      </button>

      {/* Các nút số trang */}
      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
        (pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={`px-4 py-2 rounded-md border font-medium text-sm transition-colors ${
              pageNum === pagination.currentPage
                ? "bg-blue-600 text-white border-blue-600"
                : "hover:bg-gray-50"
            }`}
          >
            {pageNum}
          </button>
        )
      )}

      {/* Nút Sau */}
      <button
        type="button"
        disabled={!pagination.hasNextPage}
        onClick={() => onPageChange(pagination.currentPage + 1)}
        className="px-4 py-2 rounded-md border font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        Sau →
      </button>
    </div>
  );
}
