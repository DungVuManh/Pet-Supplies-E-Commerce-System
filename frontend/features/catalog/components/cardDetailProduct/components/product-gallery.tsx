"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-gallery.tsx
// Component hiển thị thư viện ảnh sản phẩm
// Hỗ trợ nút điều hướng trái/phải và cuộn ngang thumbnail
// =============================================================

import Image from "next/image";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ProductGalleryProps = {
  productName: string;
  images: string[];
  activeImage: number;
  onSelectImage: (index: number) => void;
};

export function ProductGallery({
  productName,
  images,
  activeImage,
  onSelectImage,
}: ProductGalleryProps) {
  const currentImage = images[activeImage] || images[0] || "/images/products/royal-canin-mini-adult.png";

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    const prevIndex = (activeImage - 1 + images.length) % images.length;
    onSelectImage(prevIndex);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    const nextIndex = (activeImage + 1) % images.length;
    onSelectImage(nextIndex);
  };

  return (
    <div className="w-full min-w-0 flex flex-col items-center md:items-end">
      {/* Khung ảnh chính lớn: Kích thước 520px x 520px, có nút navigator trái/phải */}
      <div className="group relative aspect-square w-full max-w-[520px] max-h-[520px] overflow-hidden rounded-2xl bg-white border border-gray-200/80 p-4 flex items-center justify-center shadow-xs">
        <Image
          src={currentImage}
          alt={productName}
          fill
          sizes="(min-width: 1024px) 520px, (min-width: 768px) 50vw, 100vw"
          className="object-contain p-2 transition-transform duration-300 hover:scale-105"
          priority
        />

        {/* Nút điều hướng Trái / Phải trên ảnh chính */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md border border-gray-200 flex items-center justify-center transition-all cursor-pointer z-10 hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 -ml-0.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Ảnh kế tiếp"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md border border-gray-200 flex items-center justify-center transition-all cursor-pointer z-10 hover:scale-110 active:scale-95"
            >
              <ChevronRight className="w-5 h-5 -mr-0.5" />
            </button>
          </>
        )}
      </div>

      {/* Danh sách ảnh thu nhỏ: Không xuống dòng (flex-nowrap), cuộn ngang mượt mà khi có nhiều ảnh */}
      {images.length > 1 && (
        <div className="mt-3.5 flex flex-nowrap items-center gap-2.5 w-full max-w-[520px] overflow-x-auto pb-2 pt-1 scroll-smooth [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectImage(i)}
              className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border bg-white p-1 transition-all cursor-pointer ${
                activeImage === i
                  ? "border-blue-600 ring-2 ring-blue-600/20"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <Image
                src={src}
                alt={`${productName} ${i + 1}`}
                fill
                sizes="72px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
