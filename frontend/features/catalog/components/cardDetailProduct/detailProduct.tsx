"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/detailProduct.tsx
// Component chính: Màn hình chi tiết sản phẩm kết hợp các sub-components
// =============================================================

import React from "react";
import type { Product } from "./types";
import { ProductActions } from "./components/product-actions";
import { ProductGallery } from "./components/product-gallery";
import { ProductInfo } from "./components/product-info";
import { ProductTabs } from "./components/product-tabs";
import { ProductVariants } from "./components/product-variants";
import { useProductDetail } from "./hooks/use-product-detail";

export function DetailProduct({ product }: { product: Product }) {
  const {
    images,
    activeImage,
    setActiveImage,
    variants,
    selectedVariantIndex,
    setSelectedVariantIndex,
    currentPrice,
    currentStock,
    ratingAvg,
    ratingCount,
    quantity,
    increaseQuantity,
    decreaseQuantity,
    isLove,
    toggleLove,
  } = useProductDetail(product);

  const isOutOfStock = currentStock <= 0;

  return (
    <div>
      <article className="grid grid-cols-1 gap-10 md:grid-cols-[1.1fr_1fr]">
        {/* Cột trái: Thư viện ảnh sản phẩm */}
        <ProductGallery
          productName={product.name}
          images={images}
          activeImage={activeImage}
          onSelectImage={setActiveImage}
        />

        {/* Cột phải: Thông tin, biến thể & hành động mua hàng */}
        <div>
          {/* Thông tin sản phẩm, thương hiệu, đánh giá, giá, mô tả */}
          <ProductInfo
            brand={product.brand}
            name={product.name}
            price={currentPrice}
            description={product.description}
            ratingAvg={ratingAvg}
            ratingCount={ratingCount}
          />

          {/* Chọn biến thể khối lượng & trạng thái tồn kho */}
          <ProductVariants
            variants={variants}
            selectedIndex={selectedVariantIndex}
            currentStock={currentStock}
            onSelectVariant={setSelectedVariantIndex}
          />

          {/* Thao tác chọn số lượng, thêm giỏ hàng, mua ngay & lưu yêu thích */}
          <ProductActions
            quantity={quantity}
            isLove={isLove}
            isOutOfStock={isOutOfStock}
            onIncreaseQuantity={increaseQuantity}
            onDecreaseQuantity={decreaseQuantity}
            onToggleLove={toggleLove}
          />
        </div>
      </article>

      {/* Tabs mô tả chi tiết, thành phần & đánh giá */}
      <ProductTabs product={product} />
    </div>
  );
}

export default DetailProduct;
