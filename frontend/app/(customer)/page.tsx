import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeHero } from "@/features/catalog/components/home-hero";
import { ProductDiscovery, ProductDiscoveryContent } from "@/features/catalog/components/product-discovery";

export const metadata: Metadata = { title: "Đồ dùng và dinh dưỡng cho thú cưng" };

export default function ProductHomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-6 outline-none xl:px-16">
      <div> 
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.8px] sm:text-[32px]">Chào bạn, hôm nay bé cần gì?</h1>
        <p className="mt-2 text-sm text-muted">Những lựa chọn phù hợp cho người bạn nhỏ của bạn, ngay tại đây.</p>
      </div>
      <div className="flex flex-col gap-4">
        <HomeHero />
        <Suspense fallback={<ProductDiscoveryContent />}>
          <ProductDiscovery />
        </Suspense>
      </div>
    </main>
  );
}
