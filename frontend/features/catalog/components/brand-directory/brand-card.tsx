import Link from "next/link";
import type { CatalogBrand } from "../listProduct/types";

export function BrandCard({ brand, featured = false }: { brand: CatalogBrand; featured?: boolean }) {
  const href = `/listProduct/allProducts?${new URLSearchParams({ brandName: brand.name })}`;

  return (
    <Link
      href={href}
      className={`flex h-full flex-col justify-center gap-2 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand hover:bg-brand-subtle focus-visible:outline-offset-[-3px] ${featured ? "min-h-28 items-center text-center" : "min-h-20"}`}
    >
      <span className={`break-words font-semibold text-ink ${featured ? "text-lg" : "text-sm"}`}>
        {brand.name}
      </span>
      <span className="text-sm text-muted">{brand.productCount.toLocaleString("vi-VN")} sản phẩm</span>
    </Link>
  );
}
