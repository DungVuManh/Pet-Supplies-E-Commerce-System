"use client";

// =============================================================
// components/storefront/storefront-search.tsx
// Thanh tìm kiếm sản phẩm trên Header tích hợp:
// 1. Live Search Autocomplete Dropdown (gợi ý nhanh danh sách sản phẩm)
// 2. Chuyển hướng chuẩn sang trang kết quả tìm kiếm /search?q=...
// =============================================================

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Loader2, X } from "lucide-react";
import type { FormEvent } from "react";
import { getProductsApi } from "@/features/catalog/components/listProduct/services/catalog.service";
import type { CatalogProduct } from "@/features/catalog/components/listProduct/types";

export function StorefrontSearch() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  return <StorefrontSearchForm key={query} query={query} />;
}

export function StorefrontSearchForm({ query: initialQuery = "" }: { query?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Tìm kiếm và chuyển hướng sang /search?q=...
  function handleSearch(e?: FormEvent) {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    setIsDropdownOpen(false);

    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  }

  // 2. Xóa ô tìm kiếm
  function handleClear() {
    setQuery("");
    setSuggestions([]);
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  }

  // 3. Debounced Live Search Autocomplete
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setSuggestions([]);
      setIsLoading(false);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setIsLoading(true);
        const res = await getProductsApi(
          {
            search: trimmed,
            limit: 6,
            category: "all",
            petType: "all",
            brands: [],
            priceRanges: [],
            sort: "default",
            page: 1,
          },
          controller.signal
        );

        if (!controller.signal.aborted) {
          setSuggestions(res.data.products);
          setIsDropdownOpen(true);
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("[StorefrontSearch] Lỗi gợi ý tìm kiếm:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // 4. Lắng nghe click ngoài để đóng dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="order-last relative flex h-12 w-full items-center rounded-lg border border-line bg-canvas px-4 md:order-none md:min-w-0 md:flex-1"
    >
      <form
        onSubmit={handleSearch}
        role="search"
        aria-label="Tìm kiếm sản phẩm"
        className="flex h-full w-full items-center gap-3"
      >
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="flex h-10 w-6 shrink-0 items-center justify-center rounded hover:opacity-80 transition-opacity"
        >
          <Image src="/icons/search.svg" width={20} height={20} alt="" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim() && suggestions.length > 0) {
              setIsDropdownOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsDropdownOpen(false);
            }
          }}
          maxLength={100}
          aria-label="Tìm kiếm sản phẩm"
          aria-expanded={isDropdownOpen}
          placeholder="Tìm thức ăn, đồ chơi, phụ kiện cho thú cưng..."
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted outline-none"
        />

        {/* Loading icon */}
        {isLoading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" aria-hidden="true" />
        )}

        {/* Nút Clear xóa nhanh từ khóa */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Xóa từ khóa"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted hover:bg-gray-200 hover:text-ink transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Dropdown Gợi ý Nhanh (Autocomplete Popup) */}
      {isDropdownOpen && query.trim() && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full rounded-xl border border-line bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {suggestions.length > 0 ? (
            <>
              <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
                {suggestions.map((item) => (
                  <Link
                    key={item._id}
                    href={`/listProduct/detailProduct?id=${item._id}`}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 p-3 hover:bg-surface transition-colors group"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
                      <Image
                        src={item.image || "/images/products/default.png"}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink group-hover:text-brand transition-colors">
                        {item.name}
                      </p>
                      <p className="text-xs font-semibold text-brand mt-0.5">
                        {typeof item.price === "number"
                          ? `${item.price.toLocaleString("vi-VN")} đ`
                          : "Liên hệ"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Chân Dropdown: Xem tất cả kết quả */}
              <button
                type="button"
                onClick={() => handleSearch()}
                className="flex w-full items-center justify-center gap-1.5 border-t border-line bg-gray-50 py-3 px-4 text-center text-xs font-semibold text-brand hover:bg-brand/5 hover:underline transition-colors"
              >
                <span>Xem tất cả kết quả cho &quot;{query.trim()}&quot;</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : !isLoading ? (
            <div className="p-6 text-center text-sm text-muted">
              <p className="font-medium text-ink">Không tìm thấy sản phẩm gợi ý</p>
              <p className="text-xs mt-1 text-muted">
                Nhấn Enter hoặc click kính lúp để tìm kiếm trên trang kết quả
              </p>
              <button
                type="button"
                onClick={() => handleSearch()}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                <span>Tìm kiếm &quot;{query.trim()}&quot;</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
