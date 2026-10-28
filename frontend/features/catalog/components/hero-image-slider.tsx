"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HeroSlide = {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  tag?: string;
};

const DEFAULT_SLIDES: readonly HeroSlide[] = [
  {
    id: "senmoi-deal",
    title: "Ra mắt Website mới - Sen mới nhận deal hời giảm 50K",
    imageUrl: "/images/hero/hero-senmoi-deal.jpg",
    link: "/listProduct/allProducts",
    tag: "Ưu đãi Hot",
  },
  {
    id: "smartheart-gold",
    title: "SmartHeart Gold Holistic - Tạm biệt ố mắt, dinh dưỡng chuyên sâu cho Cún",
    imageUrl: "/images/hero/hero-smartheart-gold.jpg",
    link: "/listProduct/allProducts?petType=dog",
    tag: "Dành cho Cún",
  },
  {
    id: "ciao-churu",
    title: "Khuyến mãi súp thưởng Ciao Churu - Hộp 100 thanh tặng thêm 20 thanh",
    imageUrl: "/images/hero/hero-ciao-churu.jpg",
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const total = slides.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Autoplay
  useEffect(() => {
    if (isPaused || total <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [isPaused, total, nextSlide, autoplayInterval]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
    } else if (e.key === "ArrowRight") {
      nextSlide();
    }
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const diff = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 50;
      if (diff > minSwipeDistance) {
        nextSlide();
      } else if (diff < -minSwipeDistance) {
        prevSlide();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

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

      {/* 2. Nút chuyển slide Trái (Previous button) - tròn trắng nổi bật */}
      <button
        type="button"
        aria-label="Slide trước"
        onClick={prevSlide}
        className="absolute left-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-line/60 bg-white/90 text-ink shadow-md backdrop-blur-xs transition-all hover:bg-white hover:scale-105 active:scale-95 sm:left-5 sm:size-11 sm:bg-white focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ChevronLeft className="size-5 sm:size-6" />
      </button>

      {/* 3. Nút chuyển slide Phải (Next button) - tròn trắng nổi bật */}
      <button
        type="button"
        aria-label="Slide kế tiếp"
        onClick={nextSlide}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-line/60 bg-white/90 text-ink shadow-md backdrop-blur-xs transition-all hover:bg-white hover:scale-105 active:scale-95 sm:right-5 sm:size-11 sm:bg-white focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ChevronRight className="size-5 sm:size-6" />
      </button>

      {/* 4. Thanh điều hướng đáy (Bottom-center indicator pill - chuẩn như ảnh mẫu) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 shadow-md backdrop-blur-md sm:bottom-4">
        {/* Nút lùi nhỏ trong pill */}
        <button
          type="button"
          aria-label="Lùi 1 slide"
          onClick={prevSlide}
          className="flex size-4 items-center justify-center text-white/70 transition-colors hover:text-white"
        >
          <ChevronLeft className="size-3.5" />
        </button>

        {/* Các chấm chuyển slide (Pagination dots) */}
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

        {/* Nút tiến nhỏ trong pill */}
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
