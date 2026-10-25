import type { Metadata } from "next";
import { AllProduct } from "@/features/catalog/components/listProduct";

export const metadata: Metadata = { title: "Sản phẩm đồ dùng và dinh dưỡng cho thú cưng" };

export default function ProductHomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-6 outline-none xl:px-16">
      <div> 
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.8px] sm:text-[32px]">Sản phẩm cho thú cưng</h1>
        {/* Cân điều chỉnh lại total sản phẩm BE */}
        <p className="mt-2 text-sm text-muted">Khám phá 128 sản phẩm chính hãng cho những người bạn nhỏ.</p>
      </div>
      <div className="flex flex-col gap-4">
         <AllProduct />
      </div>
    </main>
  );
}
