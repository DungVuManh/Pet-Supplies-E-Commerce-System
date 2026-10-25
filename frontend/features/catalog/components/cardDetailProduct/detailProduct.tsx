"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/detailProduct.tsx
// Component chính: Màn hình chi tiết sản phẩm kết hợp các sub-components
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
import { createOrderApi } from "@/features/orders/services/order.service";

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

  // 1. Bấm Mua ngay: Lưu đơn hàng trực tiếp vào MongoDB (orders collection)
  const handleBuyNow = async () => {
    try {
      setIsBuyingNow(true);
      setOrderFeedback(null);

      const sku = variants[selectedVariantIndex]?.sku || product.variants?.[0]?.sku || "default";

      const res = await createOrderApi({
        items: [
          {
            productId: product.id,
            variantSku: sku,
            qty: quantity,
          },
        ],
      });

      const orderId = res.data?.order?._id;
      if (!orderId) {
        throw new Error("Không nhận được mã đơn hàng để chuyển đến thanh toán.");
      }

      router.push(`/checkout?orderId=${encodeURIComponent(orderId)}`);
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
