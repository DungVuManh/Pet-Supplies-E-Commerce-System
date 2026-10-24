// =============================================================
// features/catalog/components/cardDetailProduct/hooks/use-product-detail.ts
// Hook quản lý toàn bộ logic và state của màn hình chi tiết sản phẩm
// =============================================================

import { useState } from "react";
import type { Product, ProductVariantItem } from "../types";

export function useProductDetail(product: Product) {
  // 1. Mảng ảnh sản phẩm: Sử dụng ảnh từ product thật, không dùng mock
  const images: string[] =
    product.images && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : [];

  // 2. Danh sách biến thể: Lấy trực tiếp từ product, không tạo biến thể giả lập
  const variants: ProductVariantItem[] = product.variants ?? [];

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLove, setIsLove] = useState(false);

  // Tính toán biến thể hiện tại và giá/tồn kho tương ứng
  const currentVariant = variants[selectedVariantIndex] || variants[0];
  const currentPrice = currentVariant?.price ?? product.price ?? 0;
  const currentStock =
    currentVariant?.availableStock ??
    currentVariant?.stock ??
    (product.inStock ? 1 : 0);
  const ratingAvg = product.ratingAvg ?? 0;
  const ratingCount = product.ratingCount ?? 0;

  const increaseQuantity = () => setQuantity((q) => q + 1);
  const decreaseQuantity = () => setQuantity((q) => Math.max(1, q - 1));
  const toggleLove = () => setIsLove((prev) => !prev);

  return {
    images,
    activeImage,
    setActiveImage,
    variants,
    selectedVariantIndex,
    setSelectedVariantIndex,
    currentVariant,
    currentPrice,
    currentStock,
    ratingAvg,
    ratingCount,
    quantity,
    increaseQuantity,
    decreaseQuantity,
    isLove,
    toggleLove,
  };
}
