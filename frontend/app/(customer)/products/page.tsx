import type { Metadata } from "next";
import { Suspense } from "react";
import { AllProduct } from "@/features/catalog/components/listProduct";

export const metadata: Metadata = {
  title: "Sản phẩm cho thú cưng | Petjoy",
  description: "Khám phá các sản phẩm chất lượng, chính hãng dành cho chó và mèo tại Petjoy.",
};

type ProductsPageProps = {
  searchParams: Promise<{ category?: string; petType?: string }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category, petType } = await searchParams;

  const pageTitle =
    petType === "dog"
      ? "Sản phẩm dành cho chó"
      : petType === "cat"
      ? "Sản phẩm dành cho mèo"
      : "Sản phẩm cho thú cưng";

  const pageDesc =
    petType === "dog"
      ? "Khám phá các sản phẩm thức ăn, đồ chơi, phụ kiện chính hãng dành riêng cho cún cưng."
      : petType === "cat"
      ? "Khám phá các sản phẩm thức ăn, đồ chơi, phụ kiện chính hãng dành riêng cho mèo cưng."
      : "Khám phá các sản phẩm chính hãng cho những người bạn nhỏ.";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-6 outline-none xl:px-16"
    >
      <div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.8px] sm:text-[32px]">
          {pageTitle}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {pageDesc}
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
          <AllProduct defaultCategory={category} defaultPetType={petType} />
        </Suspense>
      </div>
    </main>
  );
}
