"use client";

// =============================================================
// features/catalog/components/homePage/hooks/use-hero-slider.ts
// Hook quản lý logic chuyển slide tự động, phím điều hướng & swipe mobile
// =============================================================

import { useState, useEffect, useRef, useCallback } from "react";

export function useHeroSlider(totalSlides: number, autoplayInterval = 4500) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Tự động lặp lại slide theo chu kỳ thời gian
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [isPaused, totalSlides, nextSlide, autoplayInterval]);

  // Điều hướng bằng bàn phím
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
    } else if (e.key === "ArrowRight") {
      nextSlide();
    }
  };

  // Hỗ trợ cảm ứng vuốt trên mobile
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

  return {
    currentIndex,
    nextSlide,
    prevSlide,
    goToSlide,
    setIsPaused,
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
