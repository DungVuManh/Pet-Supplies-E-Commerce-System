"use client";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { brandLetters, useBrandDirectory } from "../../hooks/use-brand-directory";
import { BrandCard } from "./brand-card";
import { FeaturedBrands } from "./featured-brands";

export function BrandDirectory() {
  const directory = useBrandDirectory();

  if (directory.status === "loading") {
    return <p role="status" className="mt-6 rounded-xl border border-line bg-canvas p-6 text-muted">Đang tải thương hiệu…</p>;
  }

  if (directory.status === "error") {
    return (
      <div className="mt-6 rounded-xl border border-line bg-canvas p-6">
        <p role="alert" className="mb-4 text-danger">Không thể tải danh sách thương hiệu.</p>
        <Button onClick={directory.retry}>Thử lại</Button>
      </div>
    );
  }

  if (directory.count === 0) {
    return <p role="status" className="mt-6 rounded-xl border border-line bg-canvas p-6 text-muted">Chưa có thương hiệu nào trong danh mục sản phẩm.</p>;
  }

  return (
    <>
      <p className="mt-2 text-sm text-muted">{directory.count.toLocaleString("vi-VN")} thương hiệu tại Petjoy</p>

      <div className="mt-8">
        <FeaturedBrands brands={directory.featured} />
      </div>

      <section aria-labelledby="brand-directory-title" className="mt-8 flex flex-col gap-4 border-t border-line pt-8 sm:mt-12">
        <h2 id="brand-directory-title" className="text-xl font-semibold sm:text-2xl">Tất cả thương hiệu</h2>
        <TextField
          id="brand-search"
          label="Tìm thương hiệu"
          type="search"
          placeholder="Nhập tên thương hiệu"
          value={directory.query}
          onChange={(event) => directory.setQuery(event.target.value)}
        />
        <div role="group" aria-label="Lọc thương hiệu theo chữ cái" className="flex flex-wrap gap-2">
          {["", ...brandLetters].map((letter) => (
            <button
              key={letter}
              type="button"
              aria-pressed={directory.letter === letter}
              aria-label={letter === "#" ? "Số hoặc ký tự khác" : undefined}
              disabled={Boolean(letter) && !directory.availableLetters.has(letter)}
              onClick={() => directory.setLetter(letter)}
              className="min-h-10 min-w-10 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white aria-pressed:hover:text-white disabled:bg-canvas disabled:text-muted disabled:hover:border-line xl:min-w-9"
            >
              {letter || "Tất cả"}
            </button>
          ))}
        </div>

        {directory.groups.size === 0 ? (
          <div className="rounded-xl border border-line bg-canvas p-6">
            <p role="status" className="mb-4 text-muted">Không tìm thấy thương hiệu phù hợp.</p>
            <Button onClick={directory.clearFilters}>Xóa bộ lọc</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {brandLetters.map((letter) => {
              const brands = directory.groups.get(letter);
              if (!brands) return null;
              const headingId = `brands-group-${letter === "#" ? "other" : letter}`;

              return (
                <div key={letter} className="flex flex-col gap-2">
                  <h3 id={headingId} className="text-lg font-semibold">{letter}</h3>
                  <ul aria-labelledby={headingId} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {brands.map((brand) => (
                      <li key={brand.name} className="min-w-0"><BrandCard brand={brand} /></li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
