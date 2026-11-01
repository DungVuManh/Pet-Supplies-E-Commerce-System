"use client";

// =============================================================
// features/catalog/components/listProduct/components/quick-add-modal.tsx
// Modal chọn nhanh phân loại & số lượng khi bấm "Thêm vào giỏ"
// Giữ nguyên brand theme chuẩn (#2563eb / Tailwind brand) của hệ thống
// =============================================================

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { addToCartApi } from "@/features/cart/services/cart.service";
import type { Product, ProductVariantItem } from "../../../products";

interface QuickAddModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ product, isOpen, onClose }: QuickAddModalProps) {
  const [mounted, setMounted] = useState(false);
  const [variants, setVariants] = useState<ProductVariantItem[]>(product.variants || []);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Mount flag cho Next.js portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Nếu product chưa có variants, fetch chi tiết để lấy variants đầy đủ
  useEffect(() => {
    let active = true;

    if (isOpen) {
      if (!product.variants || product.variants.length === 0) {
        fetch(`/api/v1/catalog/products/${product.id}`)
          .then((res) => res.json())
          .then((json) => {
            if (active && json?.data?.product?.variants?.length > 0) {
              const fetchedVariants: ProductVariantItem[] = json.data.product.variants.map(
                (v: { sku: string; label: string; price: number; stock: number }) => ({
                  sku: v.sku,
                  label: v.label,
                  price: v.price,
                  stock: v.stock,
                }),
              );
              setVariants(fetchedVariants);
              setSelectedSku(fetchedVariants[0]?.sku || "");
            }
          })
          .catch(() => {
            // Giữ nguyên variants mặc định
          });
      } else {
        setVariants(product.variants);
        setSelectedSku(product.variants[0]?.sku || "");
      }

      setQuantity(1);
      setIsSuccess(false);
    }

    return () => {
      active = false;
    };
  }, [isOpen, product.id, product.variants]);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  // Lấy variant đang chọn
  const activeVariant =
    variants.find((v) => v.sku === selectedSku) ||
    variants[0] || {
      sku: "DEFAULT",
      label: "Mặc định",
      price: product.price,
      stock: 99,
    };

  const currentPrice = activeVariant.price ?? product.price;
  const maxStock = activeVariant.stock !== undefined ? activeVariant.stock : 99;
  const isOutOfStock = maxStock <= 0;

  // Tăng/giảm số lượng
  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity((prev) => (maxStock > 0 ? Math.min(maxStock, prev + 1) : prev + 1));
  };

  // Xác nhận thêm vào giỏ hàng
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || isOutOfStock) return;

    setIsAdding(true);
    try {
      await addToCartApi({
        productId: product.id,
        variantSku: activeVariant.sku,
        quantity,
        name: product.name,
        price: currentPrice,
        image: product.image,
        brand: product.brand,
        label: activeVariant.label,
        stock: activeVariant.stock,
      });

      // Bắn event để CartBadge trên Header cập nhật ngay lập tức
      window.dispatchEvent(new Event("cart-updated"));
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Lỗi khi thêm vào giỏ hàng:", err);
      alert("Không thể thêm vào giỏ hàng. Vui lòng thử lại sau.");
    } finally {
      setIsAdding(false);
    }
  };

  // Kiểm tra xem có cần hiển thị danh sách variant hay không
  // Nếu có từ 2 variant trở lên HOẶC 1 variant có nhãn rõ ràng (khác "Mặc định")
  const hasMultipleVariants =
    variants.length > 1 || (variants.length === 1 && variants[0].label !== "Mặc định");

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* 1. Backdrop nền tối mờ */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      {/* 2. Container nội dung Modal */}
      <div
        className="relative z-10 w-full max-w-[480px] rounded-3xl bg-surface p-5 sm:p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Tiêu đề & Nút đóng (X) */}
        <div className="flex items-center justify-between border-b border-line pb-3.5">
          <h2 id="quick-add-title" className="text-base sm:text-lg font-bold text-ink">
            Thêm vào giỏ hàng
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="Đóng cửa sổ"
            className="flex size-7 items-center justify-center rounded-full border border-line text-muted hover:bg-canvas hover:text-ink transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Thông tin vắn tắt sản phẩm */}
        <div className="flex items-center gap-3.5 py-4 border-b border-line">
          <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-canvas">
            <Image
              src={product.image || "/images/products/royal-canin-mini-adult.png"}
              alt={product.name}
              fill
              className="object-contain p-1"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-semibold text-ink line-clamp-2 leading-snug">
              {product.name}
            </h3>
            <p className="mt-1.5 text-base sm:text-lg font-bold text-brand">
              {formatCurrency(currentPrice)}
            </p>
            {activeVariant.stock !== undefined && (
              <p className="text-[11px] text-muted">
                {activeVariant.stock > 0 ? (
                  `Còn ${activeVariant.stock} sản phẩm`
                ) : (
                  <span className="text-danger font-semibold">Tạm hết hàng</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Danh sách phân loại (Kích cỡ / Loại) */}
        {hasMultipleVariants && (
          <div className="py-4 border-b border-line">
            <h4 className="text-xs sm:text-sm font-semibold text-ink mb-3">
              Kích cỡ / Phân loại
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {variants.map((v) => {
                const isSelected = v.sku === activeVariant.sku;
                const outOfStock = v.stock <= 0;

                return (
                  <button
                    key={v.sku}
                    type="button"
                    disabled={outOfStock}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSku(v.sku);
                      setQuantity(1);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl text-center transition-all ${
                      isSelected
                        ? "border-2 border-brand bg-brand-subtle text-brand font-semibold shadow-xs"
                        : "border border-line bg-surface text-ink hover:border-slate-300"
                    } ${outOfStock ? "opacity-40 cursor-not-allowed border-dashed bg-canvas text-muted line-through" : ""}`}
                  >
                    <span className="text-xs sm:text-sm font-semibold truncate max-w-full">
                      {v.label}
                    </span>
                    <span
                      className={`text-[11px] mt-0.5 truncate max-w-full ${
                        isSelected ? "text-brand font-medium" : "text-muted"
                      }`}
                    >
                      {outOfStock ? "Hết hàng" : formatCurrency(v.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bộ chọn số lượng */}
        <div className="flex items-center justify-between py-4">
          <span className="text-xs sm:text-sm font-semibold text-ink">Số lượng</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={quantity <= 1 || isOutOfStock}
              onClick={handleDecrease}
              aria-label="Giảm số lượng"
              className="flex size-8 items-center justify-center rounded-full border border-line text-ink hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-ink">{quantity}</span>
            <button
              type="button"
              disabled={quantity >= maxStock || isOutOfStock}
              onClick={handleIncrease}
              aria-label="Tăng số lượng"
              className="flex size-8 items-center justify-center rounded-full border border-line text-ink hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Nút hành động "Thêm vào giỏ hàng" */}
        <button
          type="button"
          disabled={isAdding || isOutOfStock}
          onClick={handleAddToCart}
          className={`mt-2 flex w-full h-11 sm:h-12 items-center justify-center gap-2 rounded-2xl text-sm sm:text-base font-semibold text-white shadow-sm transition-all active:scale-[0.99] ${
            isSuccess
              ? "bg-emerald-600 hover:bg-emerald-700"
              : isOutOfStock
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-brand hover:bg-brand-hover"
          }`}
        >
          {isSuccess ? (
            <>
              <Check className="size-5" />
              <span>Đã thêm vào giỏ hàng!</span>
            </>
          ) : isAdding ? (
            <span>Đang thêm vào giỏ...</span>
          ) : isOutOfStock ? (
            <span>Sản phẩm tạm hết hàng</span>
          ) : (
            <>
              <ShoppingCart className="size-5" />
              <span>Thêm vào giỏ hàng</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
