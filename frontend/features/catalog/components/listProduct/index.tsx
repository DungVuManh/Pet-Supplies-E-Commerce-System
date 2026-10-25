"use client";

import React from "react";
import { FilterSidebar } from "./components/filter-sidebar";
import { ProductGrid } from "./components/product-grid";
import { ProductPagination } from "./components/product-pagination";
import { ProductToolbar } from "./components/product-toolbar";
import { useProductList } from "./hooks/use-product-list";

export function AllProduct() {
  const {
    products,
    categories,
    brands,
    pagination,
    filter,
    searchInput,
    loadingProducts,
    loadingFilters,
    error,
    setSearchInput,
    handleCategoryChange,
    handlePriceRangeChange,
    handleBrandChange,
    handleSortChange,
    handleDeleteFilter,
    handlePageChange,
  } = useProductList();

  return (
    <main>
      <div className="flex items-start">
        {/* Sidebar bộ lọc */}
        <FilterSidebar
          categories={categories}
          brands={brands}
          selectedCategory={filter.category}
          selectedPrices={filter.priceRanges}
          selectedBrands={filter.brands}
          loadingFilters={loadingFilters}
          onCategoryChange={handleCategoryChange}
          onPriceRangeChange={handlePriceRangeChange}
          onBrandChange={handleBrandChange}
          onDeleteFilter={handleDeleteFilter}
        />

        {/* Nội dung danh sách sản phẩm */}
        <div className="w-3/4 flex-1 ml-5">
          {/* Thanh tìm kiếm & sắp xếp */}
          <ProductToolbar
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            totalProducts={pagination?.totalProducts ?? 0}
            loadingProducts={loadingProducts}
            sort={filter.sort}
            onSortChange={handleSortChange}
          />

          {/* Lưới sản phẩm */}
          <ProductGrid
            products={products}
            loadingProducts={loadingProducts}
            error={error}
          />

          {/* Phân trang */}
          <ProductPagination
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </main>
  );
}

export default AllProduct;
