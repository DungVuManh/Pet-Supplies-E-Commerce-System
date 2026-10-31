"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/detailProduct.tsx
// Component chính: Màn hình chi tiết sản phẩm kết hợp các sub-components
// Bố cục grid cân đối giữa cột ảnh (đã căn gần giữa và phóng to vừa phải) và thông tin mua hàng
// =============================================================

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { Product } from "./types";
import { ProductActions } from "./components/product-actions";
import { ProductGallery } from "./components/product-gallery";
import { ProductInfo } from "./components/product-info";
import { ProductTabs } from "./components/product-tabs";
import { ProductVariants } from "./components/product-variants";
import { useProductDetail } from "./hooks/use-product-detail";
import { previewBuyNowApi, saveBuyNowSession } from "@/features/orders/services/order.service";

export function DetailProduct({ product }: { product: Product }) {
  const router = useRouter();

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
    isAddingToCart,
    cartFeedback,
    handleAddToCart,
  } = useProductDetail(product);

  const isOutOfStock = currentStock <= 0;

  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // 1. Bấm Mua ngay: Validate ở server (còn hàng, số lượng, lấy giá server), ghi đè session, vào checkout
  const handleBuyNow = async () => {
    try {
      setIsBuyingNow(true);
      setOrderFeedback(null);

      const sku = variants[selectedVariantIndex]?.sku || product.variants?.[0]?.sku || "default";

      const res = await previewBuyNowApi({
        productId: product.id,
        variantSku: sku,
        quantity,
      });

      if (!res.data?.item) {
        throw new Error(res.message || "Không thể tạo phiên Mua ngay.");
      }

      // Ghi đè session cũ, không cộng dồn
      saveBuyNowSession(res.data);

      router.push("/checkout?buyNow=1");
    } catch (err) {
      setOrderFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể tạo đơn mua ngay.",
      });
    } finally {
      setIsBuyingNow(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <article className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12 items-start">
        {/* Cột trái: Thư viện ảnh sản phẩm */}
        <div className="w-full min-w-0 flex justify-center md:justify-end">
          <ProductGallery
            productName={product.name}
            images={images}
            activeImage={activeImage}
            onSelectImage={setActiveImage}
          />
        </div>

        {/* Cột phải: Thông tin, biến thể & hành động mua hàng */}
        <div className="w-full min-w-0">
          {/* Thông tin sản phẩm, thương hiệu, đánh giá, giá, mô tả */}
          <ProductInfo
            brand={product.brand}
            name={product.name}
            price={currentPrice}
            description={product.description}
            ratingAvg={ratingAvg}
            ratingCount={ratingCount}
            soldCount={product.soldCount}
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
            isAddingToCart={isAddingToCart}
            isBuyingNow={isBuyingNow}
            cartFeedback={orderFeedback || cartFeedback}
            onIncreaseQuantity={increaseQuantity}
            onDecreaseQuantity={decreaseQuantity}
            onToggleLove={toggleLove}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />
        </div>
      </article>

      {/* Tabs mô tả chi tiết, thành phần & đánh giá */}
      <ProductTabs product={product} />
    </div>
  );
}

export default DetailProduct;
