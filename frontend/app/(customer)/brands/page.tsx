import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BrandDirectory } from "@/features/catalog/components/brand-directory/brand-directory";

export const metadata: Metadata = {
  title: "Thương hiệu thú cưng | Petjoy",
  description: "Tìm thương hiệu và khám phá các sản phẩm dành cho thú cưng tại Petjoy.",
};

export default function BrandsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8 xl:px-16">
      <nav aria-label="Đường dẫn" className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="rounded hover:text-brand hover:underline">Trang chủ</Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span aria-current="page" className="text-ink">Thương hiệu</span>
      </nav>
      <h1 className="text-[28px] font-semibold tracking-[-0.8px] sm:text-[32px]">Thương hiệu thú cưng</h1>
      <BrandDirectory />
    </main>
  );
}
