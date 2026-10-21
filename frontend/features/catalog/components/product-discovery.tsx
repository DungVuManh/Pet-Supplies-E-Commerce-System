"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { categories, filterProducts } from "../products";
import { CategoryCard } from "./category-card";
import { ProductCard } from "./product-card";

export function ProductDiscovery() {
  const params = useSearchParams();
  return <ProductDiscoveryContent query={params.get("q") ?? ""} category={params.get("category") ?? ""} />;
}

export function ProductDiscoveryContent({ query = "", category = "" }: { query?: string; category?: string }) {
  const selected = categories.find((item) => item.id === category);
  const filtered = filterProducts(query, category);
  const isFiltered = Boolean(query.trim() || selected);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Khám phá theo danh mục" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((item) => {
          const params = new URLSearchParams({ category: item.id });
          if (query.trim()) params.set("q", query.trim());
          return <CategoryCard key={item.id} {...item} href={`/?${params}#featured-products`} active={item.id === selected?.id} />;
        })}
      </nav>
      <section id="featured-products" aria-labelledby="products-title" className="scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="products-title" className="text-2xl font-semibold leading-[normal]">{query.trim() ? "Kết quả tìm kiếm" : selected?.name ?? "Sản phẩm nổi bật"}</h2>
          <Link href="/#featured-products" className="inline-flex min-h-6 items-center text-sm font-semibold text-brand hover:underline">
            Xem tất cả sản phẩm →
          </Link>
        </div>
        {isFiltered && <p role="status" className="mb-4 break-words text-sm leading-relaxed text-muted">{filtered.length} sản phẩm{query.trim() ? ` cho “${query.trim()}”` : ""}{selected ? ` · ${selected.name}` : ""}</p>}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-canvas px-6 py-12 text-center">
            <h3 className="text-lg font-semibold">Chưa tìm thấy sản phẩm phù hợp</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">Thử từ khóa khác hoặc xem lại tất cả sản phẩm cho các bé.</p>
            <Link href="/#featured-products" className="mt-5 inline-flex min-h-11 items-center font-semibold text-brand hover:underline">Xem tất cả sản phẩm →</Link>
          </div>
        )}
      </section>
    </div>
  );
}
