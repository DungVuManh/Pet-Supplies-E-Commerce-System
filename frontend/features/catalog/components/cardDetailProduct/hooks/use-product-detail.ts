// =============================================================
// features/catalog/components/cardDetailProduct/hooks/use-product-detail.ts
// Hook quản lý toàn bộ logic và state của màn hình chi tiết sản phẩm
// =============================================================

import { useState } from "react";
import type { Product, ProductVariantItem } from "../types";
import { addToCartApi } from "../services/cart.service";

export function useProductDetail(product: Product) {
  // 1. Mảng ảnh sản phẩm
  const images: string[] =
    product.images && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : [];

  // 2. Danh sách biến thể
  const variants: ProductVariantItem[] = product.variants ?? [];

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLove, setIsLove] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartFeedback, setCartFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  // Xử lý gửi API thêm vào giỏ hàng và lưu vào DB
  const handleAddToCart = async () => {
    if (!product.id) return;

    const variantSku =
      currentVariant?.sku || product.variants?.[0]?.sku || "default";

    try {
      setIsAddingToCart(true);
      setCartFeedback(null);

      const res = await addToCartApi({
        productId: product.id,
        variantSku,
        quantity,
        name: product.name,
        price: currentPrice,
        image: images[0] || product.image,
        brand: product.brand,
        label: currentVariant?.label,
        description: product.description,
        stock: currentStock,
      });

      setCartFeedback({
        type: "success",
        message: res.data?.message || "Đã thêm sản phẩm vào giỏ hàng!",
      });

      // Bắn event để thông báo các component khác (như Header giỏ hàng) cập nhật số lượng
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart-updated"));
      }

      // Tự động tắt thông báo sau 3 giây
      setTimeout(() => {
        setCartFeedback(null);
      }, 3000);
    } catch (err) {
      setCartFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Có lỗi xảy ra khi thêm vào giỏ hàng.",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

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
    isAddingToCart,
    cartFeedback,
    handleAddToCart,
  };
}
