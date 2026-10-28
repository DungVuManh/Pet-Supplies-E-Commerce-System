import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroImageSlider } from "@/features/catalog/components/hero-image-slider";
import { ServicePolicyBar } from "@/features/catalog/components/service-policy-bar";
import { VoucherBar } from "@/features/catalog/components/voucher-bar";
import {
 ProductDiscovery,
 ProductDiscoveryContent,
} from "@/features/catalog/components/product-discovery";
import { BrandShowcase } from "@/features/catalog/components/brand-showcase";
import { PetCareTips } from "@/features/catalog/components/pet-care-tips";

export const metadata: Metadata = {
 title: "Petjoy — Đồ dùng & dinh dưỡng chính hãng cho thú cưng",
 description:
  "Siêu thị thú cưng Petjoy cung cấp thức ăn, phụ kiện, cát vệ sinh và dinh dưỡng chính hãng cho chó mèo.",
};

export default function ProductHomePage() {
 return (
  <main
   id="main-content"
   tabIndex={-1}
   className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-4 py-6 outline-none sm:px-6 xl:px-16"
  >
   {/* 1. Image Slider Banner (theo phong cách Paddy.vn) */}
   <HeroImageSlider />

   {/* 3. Mã giảm giá độc quyền */}
   <VoucherBar />

   {/* 4. Khám phá danh mục & Sản phẩm nổi bật (kết nối API) */}
   <Suspense fallback={<ProductDiscoveryContent />}>
    <ProductDiscovery />
   </Suspense>

   {/* 5. Thương hiệu Boss Mê */}
   <BrandShowcase />

   {/* 6. Cẩm nang chăm sóc bé cưng */}
   <PetCareTips />
  </main>
 );
}
