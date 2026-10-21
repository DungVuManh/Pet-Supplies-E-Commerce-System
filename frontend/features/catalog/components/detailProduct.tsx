"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Heart, Zap } from "lucide-react"; // npm i lucide-react
import type { Product } from "../products";
import { ProductTabs } from "./tabs";

function DetailProduct({ product }: { product: Product }) {
  const images: string[] = [product.image, product.image, product.image];

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState("2 kg");
  const [isLove, setIsLove] = useState(false);

  return (
    <div>
      <article className="grid grid-cols-1 gap-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            {images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-lg border bg-gray-100 ${
                  activeImage === i ? "border-blue-500" : "border-gray-200"
                }`}
              >
                <Image
                  src={src}
                  alt={`${product.name} ${i + 1}`}
                  fill
                  sizes="74px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between text-sm">
            <span className="font-medium uppercase tracking-wide text-slate-500">
              {product.brand}
            </span>
            <span className="text-slate-600">★ 4,9 / 5 · 128 đánh giá</span>
          </div>

          <h1 className="mt-3 text-[28px] font-semibold">{product.name}</h1>

          <p className="mt-4 text-4xl font-medium text-blue-600">
            {product.price.toLocaleString("vi-VN")} ₫
          </p>

          <p className="mt-6 text-slate-600">{product.description}</p>

          {/* Khối lượng */}
          <div className="mt-6 flex items-center gap-3 text-sm">
            <span className="text-slate-500">Khối lượng</span>
            {["2 kg", "8 kg"].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeight(w)}
                className={`rounded-full px-3 py-1 font-medium ${
                  weight === w
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {w}
              </button>
            ))}
            <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
              Còn hàng · 24 túi
            </span>
          </div>

          {/* Số lượng + thêm giỏ + lưu */}
          <div className="mt-6 flex items-stretch gap-3">
            <div className="flex items-center rounded-md border">
              <button
                type="button"
                className="px-3 py-3"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{quantity}</span>
              <button
                type="button"
                className="px-3 py-3"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <ShoppingBag size={18} />
              Thêm vào giỏ hàng
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600"
            >
              <Zap size={18} />
              Mua ngay
            </button>

            <button
              type="button"
              className="flex items-center gap-2 rounded-md border px-5 font-medium"
              onClick={() => setIsLove(!isLove)}
            >
              <Heart size={18} fill={isLove ? "red" : "none"} />
              Lưu
            </button>
          </div>

          {/* Cam kết */}
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <li>✔ 100% chính hãng</li>
            <li>🚚 Giao trong 2–3 ngày</li>
            <li>↺ Đổi trả trong 7 ngày</li>
          </ul>
        </div>
      </article>

    {/* tabs  */}
      <ProductTabs product={product} />
    </div>
  );
}

export default DetailProduct;
