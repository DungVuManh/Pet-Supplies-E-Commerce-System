import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AllProduct } from "@/features/catalog/components/listProduct";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; category?: string; petType?: string }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const trimmed = q?.trim();
  const title = trimmed
    ? `Tìm kiếm "${trimmed}" | Petjoy`
    : "Tìm kiếm sản phẩm | Petjoy";

  return {
    title,
    description: trimmed
      ? `Kết quả tìm kiếm sản phẩm cho từ khóa "${trimmed}" tại siêu thị thú cưng Petjoy.`
      : "Khám phá các sản phẩm chất lượng, chính hãng dành cho thú cưng tại Petjoy.",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, category, petType } = await searchParams;
  const trimmedQuery = q?.trim() || "";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-6 outline-none xl:px-16"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-brand hover:underline transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">Tìm kiếm</span>
        {trimmedQuery && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate max-w-[200px] text-ink font-semibold">"{trimmedQuery}"</span>
          </>
        )}
      </nav>

      {/* Header title */}
      <div>
        <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.8px] sm:text-[30px] text-ink">
          {trimmedQuery ? (
            <>
              Kết quả tìm kiếm cho: <span className="text-brand">"{trimmedQuery}"</span>
            </>
          ) : (
            "Tìm kiếm sản phẩm"
          )}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {trimmedQuery
            ? `Danh sách các sản phẩm phù hợp với từ khóa "${trimmedQuery}".`
            : "Nhập từ khóa hoặc sử dụng bộ lọc bên dưới để tìm sản phẩm mong muốn."}
        </p>
      </div>

      {/* Danh sách sản phẩm kèm bộ lọc đồng bộ */}
      <div className="flex flex-col gap-4">
        <Suspense
          fallback={
            <div className="w-full py-16 text-center text-muted">
              Đang tải kết quả tìm kiếm...
            </div>
          }
        >
          <AllProduct
            defaultCategory={category}
            defaultPetType={petType}
            defaultSearch={trimmedQuery}
          />
        </Suspense>
      </div>
    </main>
  );
}

