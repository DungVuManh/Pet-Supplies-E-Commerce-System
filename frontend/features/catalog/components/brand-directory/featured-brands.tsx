import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CatalogBrand } from "../listProduct/types";
import { BrandCard } from "./brand-card";

const arrowClassName = "grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink";

export function FeaturedBrands({ brands }: { brands: CatalogBrand[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const updateArrows = () => {
      setCanGoBack(list.scrollLeft > 1);
      setCanGoForward(list.scrollLeft < list.scrollWidth - list.clientWidth - 1);
    };

    const observer = new ResizeObserver(updateArrows);
    observer.observe(list);
    list.addEventListener("scroll", updateArrows, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", updateArrows);
    };
  }, [brands.length]);

  function scroll(direction: number) {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({ left: direction * list.clientWidth });
  }

  return (
    <section aria-labelledby="featured-brands-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="featured-brands-title" className="text-xl font-semibold sm:text-2xl">Thương hiệu nổi bật</h2>
        {canGoBack || canGoForward ? (
          <div className="flex gap-2">
            <button type="button" className={arrowClassName} aria-label="Thương hiệu trước" aria-controls="featured-brands" disabled={!canGoBack} onClick={() => scroll(-1)}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" className={arrowClassName} aria-label="Thương hiệu tiếp theo" aria-controls="featured-brands" disabled={!canGoForward} onClick={() => scroll(1)}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
      <ul ref={listRef} id="featured-brands" className="grid snap-x snap-mandatory auto-cols-[10rem] grid-flow-col gap-4 overflow-x-auto pb-2 motion-safe:scroll-smooth sm:auto-cols-[11rem] lg:auto-cols-[12rem]">
        {brands.map((brand) => (
          <li key={brand.name} className="min-w-0 snap-start">
            <BrandCard brand={brand} featured />
          </li>
        ))}
      </ul>
    </section>
  );
}
