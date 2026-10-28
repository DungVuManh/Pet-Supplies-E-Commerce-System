import Link from "next/link";
import { Award, ArrowRight } from "lucide-react";

const BRANDS = [
  { name: "Royal Canin", origin: "Pháp", tag: "Dinh dưỡng chuẩn xác" },
  { name: "KONG", origin: "Mỹ", tag: "Đồ chơi huấn luyện" },
  { name: "Ganador", origin: "Pháp", tag: "Thức ăn cao cấp cho Cún" },
  { name: "Cat’s Best", origin: "Đức", tag: "Cát hữu cơ vón cục" },
  { name: "Snappy Tom", origin: "Úc", tag: "Pate không ngũ cốc" },
  { name: "Ciao Churu", origin: "Nhật Bản", tag: "Súp thưởng khoái khẩu" },
] as const;

export function BrandShowcase() {
  return (
    <section aria-labelledby="brand-showcase-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-subtle text-brand">
            <Award className="size-4" />
          </span>
          <h2 id="brand-showcase-title" className="text-xl font-semibold text-ink sm:text-2xl">
            Thương hiệu Boss mê
          </h2>
        </div>
        <Link
          href="/listProduct/allProducts"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Xem tất cả đối tác
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {BRANDS.map((brand) => (
          <Link
            key={brand.name}
            href={`/listProduct/allProducts?brands=${encodeURIComponent(brand.name)}`}
            className="group flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-4 text-center transition-all hover:border-brand/50 hover:bg-canvas"
          >
            <span className="text-sm font-bold text-ink group-hover:text-brand transition-colors">
              {brand.name}
            </span>
            <span className="mt-0.5 text-[11px] text-muted">{brand.origin}</span>
            <span className="mt-2 inline-block rounded-full bg-brand-subtle px-2 py-0.5 text-[10px] font-medium text-brand">
              {brand.tag}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
