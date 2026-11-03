"use client";

// =============================================================
// features/vouchers/components/promotion-banners.tsx
// Khối 3 banner quảng cáo Khuyến Mãi & Ưu Đãi
// Gồm 1 banner lớn phía trên và 2 banner đôi phía dưới
// =============================================================

import React from "react";
import Link from "next/link";
import Image from "next/image";

type PromoBanner = {
  id: string;
  title: string;
  href: string;
  imageSrc: string;
  alt: string;
};

const PROMO_BANNERS: {
  main: PromoBanner;
  sub: PromoBanner[];
} = {
  main: {
    id: "promo-hygiene",
    title: "Sữa tắm & phụ kiện vệ sinh",
    href: "/listProduct/allProducts",
    imageSrc: "/images/promotions/promo-hygiene.png",
    alt: "Sữa tắm & phụ kiện vệ sinh - Mua ngay",
  },
  sub: [
    {
      id: "promo-cat-food",
      title: "Thức ăn hạt dinh dưỡng cho Mèo yêu",
      href: "/products?petType=cat",
      imageSrc: "/images/promotions/promo-cat-food.png",
      alt: "Thức ăn hạt dinh dưỡng cho Mèo yêu - Mua ngay",
    },
    {
      id: "promo-dog-vet",
      title: "Thức ăn thú y bảo vệ Cún cưng",
      href: "/products?petType=dog",
      imageSrc: "/images/promotions/promo-dog-vet.png",
      alt: "Thức ăn thú y bảo vệ Cún cưng - Mua ngay",
    },
  ],
};

export function PromotionBanners() {
  return (
    <section className="mb-14 sm:mb-16">
      {/* Tiêu đề mục: "Khuyến Mãi & Ưu Đãi" với nét highlight vàng #FFD600 bên dưới chữ */}
      <div className="mb-6 sm:mb-8">
        <div className="relative inline-block">
          <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Khuyến Mãi & Ưu Đãi
          </h2>
          {/* Nét highlight vàng (#FFD600) phía dưới chữ */}
          <span
            className="absolute bottom-1 left-0 z-0 h-3 w-full rounded-full bg-[#FFD600] opacity-95"
            aria-hidden="true"
          />
        </div>
        <p className="mt-2 text-sm text-[#8E95A5] font-medium">
          Ưu đãi hấp dẫn dành riêng cho thú cưng của bạn
        </p>
      </div>

      {/* Cấu trúc 3 banner: 1 banner full-width bên trên + 2 banner đều nhau bên dưới */}
      <div className="space-y-6">
        {/* 1. Banner lớn phía trên: Sữa tắm & phụ kiện vệ sinh */}
        <Link
          href={PROMO_BANNERS.main.href}
          className="group relative block overflow-hidden rounded-[24px] shadow-xs hover:shadow-xl transition-all duration-300 active:scale-[0.99]"
        >
          <div className="relative w-full aspect-[1000/338] bg-[#0E2F90]">
            <Image
              src={PROMO_BANNERS.main.imageSrc}
              alt={PROMO_BANNERS.main.alt}
              fill
              sizes="(max-width: 1440px) 100vw, 1440px"
              priority
              className="object-cover transition-transform duration-500 group-hover:scale-[1.01]"
            />
          </div>
        </Link>

        {/* 2. Hai banner phía dưới: Thức ăn mèo & Thức ăn thú y cún */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PROMO_BANNERS.sub.map((promo) => (
            <Link
              key={promo.id}
              href={promo.href}
              className="group relative block overflow-hidden rounded-[24px] shadow-xs hover:shadow-xl transition-all duration-300 active:scale-[0.99]"
            >
              <div className="relative w-full aspect-[488/331] bg-slate-200">
                <Image
                  src={promo.imageSrc}
                  alt={promo.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PromotionBanners;

