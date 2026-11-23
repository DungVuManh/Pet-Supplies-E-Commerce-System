"use client";

// =============================================================
// features/catalog/components/homePage/components/brand-showcase.tsx
// Component hiển thị các thương hiệu đối tác (Thương hiệu Boss mê)
// Lấy dữ liệu từ bảng products.brand qua API /api/v1/catalog/brands
// =============================================================

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Award, ArrowRight } from "lucide-react";

// Dữ liệu dự phòng mặc định nếu database chưa có dữ liệu
const DEFAULT_BRANDS = [
  "Royal Canin",
  "KONG",
  "Ganador",
  "Cat's Best",
  "Snappy Tom",
  "Ciao Churu",
];

// Thông tin phụ trợ (xuất xứ, mô tả ngắn) hiển thị cho từng thương hiệu
const BRAND_META: Record<string, { origin: string; tag: string }> = {
  "Royal Canin": { origin: "Pháp", tag: "Dinh dưỡng chuẩn xác" },
  "KONG": { origin: "Mỹ", tag: "Đồ chơi huấn luyện" },
  "Ganador": { origin: "Pháp", tag: "Thức ăn cao cấp cho Cún" },
  "Cat's Best": { origin: "Đức", tag: "Cát hữu cơ vón cục" },
  "Cat’s Best": { origin: "Đức", tag: "Cát hữu cơ vón cục" },
  "Snappy Tom": { origin: "Úc", tag: "Pate không ngũ cốc" },
  "Ciao Churu": { origin: "Nhật Bản", tag: "Súp thưởng khoái khẩu" },
};

function BrandShowcaseContent() {
  const searchParams = useSearchParams();
  const urlBrand = searchParams?.get("brandName") || searchParams?.get("brands") || searchParams?.get("brand") || null;

  // 1. State lưu danh sách thương hiệu lấy từ database (bảng products, trường brand)
  const [brands, setBrands] = useState<string[]>(DEFAULT_BRANDS);

  // 2. State theo dõi thương hiệu người dùng đang chọn (active)
  const [activeBrand, setActiveBrand] = useState<string | null>(urlBrand);

  // 3. Gọi API /api/v1/catalog/brands để lấy các thương hiệu có trong bảng products
  useEffect(() => {
    async function loadBrandsFromApi() {
      try {
        const response = await fetch("/api/v1/catalog/brands");
        const result = await response.json();

        // Nếu API trả về thành công, lấy 6 thương hiệu đối tác tiêu biểu
        if (result.success && Array.isArray(result.data?.brands) && result.data.brands.length > 0) {
          setBrands(result.data.brands.slice(0, 6));
        }
      } catch (error) {
        console.error("Lỗi khi gọi API lấy thương hiệu products.brand:", error);
      }
    }

    void loadBrandsFromApi();
  }, []);

  // 4. Đồng bộ lại thương hiệu active nếu param trên URL thay đổi
  useEffect(() => {
    if (urlBrand) {
      setActiveBrand(urlBrand);
    }
  }, [urlBrand]);

  return (
    <section aria-labelledby="brand-showcase-title" className="flex flex-col gap-3">
      {/* Tiêu đề mục Thương hiệu Boss mê */}
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
          href="/brands"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Xem tất cả thương hiệu
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Grid danh sách các thương hiệu */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {brands.map((brandName) => {
          const meta = BRAND_META[brandName] || {
            origin: "Chính hãng",
            tag: "Được tin dùng",
          };
          // Kiểm tra xem thương hiệu này có đang được người dùng chọn không
          const isActive = activeBrand === brandName;

          return (
            <Link
              key={brandName}
              // Khi click: Chuyển sang trang allProducts và lọc theo thương hiệu này
              href={`/listProduct/allProducts?${new URLSearchParams({ brandName })}`}
              // Cập nhật state active để người dùng theo dõi thương hiệu đang chọn
              onClick={() => setActiveBrand(brandName)}
              className={`group flex flex-col items-center justify-center rounded-xl p-4 text-center transition-all ${
                isActive
                  ? "border-2 border-brand bg-brand-subtle text-brand shadow-sm"
                  : "border border-line bg-surface hover:border-brand/50 hover:bg-canvas"
              }`}
            >
              {/* Tên thương hiệu */}
              <span
                className={`text-sm font-bold transition-colors ${
                  isActive ? "text-brand" : "text-ink group-hover:text-brand"
                }`}
              >
                {brandName}
              </span>

              {/* Nơi xuất xứ */}
              <span className="mt-0.5 text-[11px] text-muted">{meta.origin}</span>

              {/* Tag phân loại / Trạng thái active */}
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? "bg-brand text-white"
                    : "bg-brand-subtle text-brand"
                }`}
              >
                {isActive ? "✓ Đang xem" : meta.tag}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Bọc Suspense để Next.js xử lý useSearchParams mượt mà
export function BrandShowcase() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-surface" />}>
      <BrandShowcaseContent />
    </Suspense>
  );
}
