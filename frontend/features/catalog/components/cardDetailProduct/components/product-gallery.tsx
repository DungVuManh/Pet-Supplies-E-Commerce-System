"use client";


// Component hiển thị thư viện ảnh sản phẩm

import Image from "next/image";
import React from "react";

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

  return (
    <div>
      {/* Ảnh chính lớn */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 border border-line">
        <Image
          src={currentImage}
          alt={productName}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>

      {/* Danh sách ảnh thu nhỏ: Chỉ hiển thị khi có từ 2 ảnh thật trở lên */}
      {images.length > 1 && (
        <div className="mt-4 flex items-center gap-3">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectImage(i)}
              className={`relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-lg border bg-gray-100 transition-all ${
                activeImage === i
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <Image
                src={src}
                alt={`${productName} ${i + 1}`}
                fill
                sizes="74px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
