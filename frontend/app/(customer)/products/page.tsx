import type { Metadata } from "next";
import { Suspense } from "react";
import { AllProduct } from "@/features/catalog/components/listProduct";

export const metadata: Metadata = {
  title: "Sản phẩm cho thú cưng | Petjoy",
  description: "Khám phá các sản phẩm chất lượng, chính hãng dành cho chó và mèo tại Petjoy.",
};

export default function ProductsPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-6 outline-none xl:px-16"
    >
      <div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.8px] sm:text-[32px]">
          Sản phẩm cho thú cưng
        </h1>
        <p className="mt-2 text-sm text-muted">
          Khám phá các sản phẩm chính hãng cho những người bạn nhỏ.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <Suspense
          fallback={
            <div className="w-full py-16 text-center text-muted">
              Đang tải danh sách sản phẩm...
            </div>
          }
        >
          <AllProduct />
        </Suspense>
      </div>
    </main>
  );
}

