"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "../types";
import { useHeroSlider } from "../hooks/use-hero-slider";

const DEFAULT_SLIDES: readonly HeroSlide[] = [
  {
    id: "senmoi-deal",
    title: "Ra mắt Website mới - Sen mới nhận deal hời giảm 50K",
    imageUrl: "/images/hero/hero-senmoi-deal.png",
    link: "/listProduct/allProducts",
    tag: "Ưu đãi Hot",
  },
  {
    id: "smartheart-gold",
    title: "SmartHeart Gold Holistic - Tạm biệt ố mắt, dinh dưỡng chuyên sâu cho Cún",
    imageUrl: "/images/hero/hero-smartheart-gold.png",
    link: "/listProduct/allProducts?petType=dog",
    tag: "Dành cho Cún",
  },
  {
    id: "ciao-churu",
    title: "Khuyến mãi súp thưởng Ciao Churu - Hộp 100 thanh tặng thêm 20 thanh",
    imageUrl: "/images/hero/hero-ciao-churu.png",
    link: "/listProduct/allProducts?brands=Ciao%20Churu",
    tag: "Khuyến mãi Hot",
  },
  {
    id: "silver-spoon",
    title: "Silver Spoon - Tặng voucher Urbox 100K cho hóa đơn từ 399K",
    imageUrl: "/images/hero/hero-silver-spoon.png",
    link: "/listProduct/allProducts?petType=cat",
    tag: "Quà tặng",
  },
];

export function HeroImageSlider({
  slides = DEFAULT_SLIDES,
  autoplayInterval = 4500,
}: {
  slides?: readonly HeroSlide[];
  autoplayInterval?: number;
}) {
  const {
    currentIndex,
    nextSlide,
    prevSlide,
    goToSlide,
    setIsPaused,
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useHeroSlider(slides.length, autoplayInterval);

  return (
    <section
      aria-label="Banner khuyến mãi"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="group relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {/* 1. Track chứa các slides */}
      <div
        className="relative flex w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => (
          <div key={slide.id} className="relative min-w-full shrink-0">
            <Link
              href={slide.link}
              aria-label={slide.title}
              tabIndex={currentIndex === index ? 0 : -1}
              className="relative block aspect-[1920/600] min-h-[170px] w-full bg-canvas sm:min-h-[220px] md:min-h-[280px] lg:min-h-[340px] xl:min-h-[380px]"
            >
              <Image
                src={slide.imageUrl}
                alt={slide.title}
                fill
                priority={index === 0}
                sizes="(min-width: 1440px) 1312px, (min-width: 1024px) calc(100vw - 128px), calc(100vw - 32px)"
                className="object-cover object-center"
              />
            </Link>
          </div>
        ))}
      </div>

      {/* 2. Nút chuyển slide Trái */}
      <button
        type="button"
        aria-label="Slide trước"
        onClick={prevSlide}
        className="absolute left-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-line/60 bg-white/90 text-ink shadow-md backdrop-blur-xs transition-all hover:bg-white hover:scale-105 active:scale-95 sm:left-5 sm:size-11 sm:bg-white focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ChevronLeft className="size-5 sm:size-6" />
      </button>

      {/* 3. Nút chuyển slide Phải */}
      <button
        type="button"
        aria-label="Slide kế tiếp"
        onClick={nextSlide}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-line/60 bg-white/90 text-ink shadow-md backdrop-blur-xs transition-all hover:bg-white hover:scale-105 active:scale-95 sm:right-5 sm:size-11 sm:bg-white focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ChevronRight className="size-5 sm:size-6" />
      </button>

      {/* 4. Thanh điều hướng đáy (Dots & arrows) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 shadow-md backdrop-blur-md sm:bottom-4">
        <button
          type="button"
          aria-label="Lùi 1 slide"
          onClick={prevSlide}
          className="flex size-4 items-center justify-center text-white/70 transition-colors hover:text-white"
        >
          <ChevronLeft className="size-3.5" />
        </button>

        <div className="flex items-center gap-1.5 px-0.5">
          {slides.map((slide, index) => {
            const isActive = currentIndex === index;
            return (
              <button
                key={slide.id}
                type="button"
                aria-label={`Chuyển tới slide ${index + 1}: ${slide.title}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 ${
                  isActive
                    ? "h-2 w-5 rounded-full bg-white shadow-xs"
                    : "size-2 rounded-full bg-white/40 hover:bg-white/80"
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Tiến 1 slide"
          onClick={nextSlide}
          className="flex size-4 items-center justify-center text-white/70 transition-colors hover:text-white"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </section>
  );
}
export type { HeroSlide };
