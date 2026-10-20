import Image from "next/image";
import Link from "next/link";

const categories = ["Sản phẩm", "Dành cho chó", "Dành cho mèo", "Ưu đãi của bạn"];

export function StorefrontHeader() {
  return (
    <header className="shrink-0">
      <a href="#main-content" className="sr-only z-10 rounded-lg bg-surface p-3 focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
        Chuyển đến nội dung chính
      </a>
      <div className="border-b border-line md:h-[88px]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-4 px-6 py-5 md:h-full md:flex-nowrap md:gap-8 md:py-0 xl:px-16">
          <Link href="/" aria-label="Petly — Trang chủ" className="text-[32px] font-bold tracking-[-1px] text-brand">petly</Link>
          <div className="order-last flex h-12 w-full items-center gap-4 rounded-lg border border-line bg-canvas px-4 md:order-none md:min-w-0 md:flex-1" role="search" aria-label="Tìm kiếm sản phẩm">
            <Image src="/icons/search.svg" width={20} height={20} alt="" className="shrink-0" />
            <input
              type="search"
              aria-label="Tìm kiếm sản phẩm (sắp ra mắt)"
              placeholder="Tìm thức ăn, đồ chơi, phụ kiện cho thú cưng..."
              disabled
              className="min-w-0 flex-1 bg-transparent text-sm text-muted placeholder:text-muted disabled:cursor-not-allowed"
            />
          </div>
          <div className="ml-auto flex items-center gap-4 whitespace-nowrap md:ml-0 md:gap-8">
            <a href="tel:1900636789" className="hidden text-brand hover:underline sm:inline">Trợ giúp</a>
            <span>Giỏ hàng (0)</span>
            <Link href="/login" className="font-semibold hover:text-brand">Đăng nhập</Link>
          </div>
        </div>
      </div>
      <div className="h-12 border-b border-line">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-6 px-6 xl:px-16">
          <nav aria-label="Danh mục sản phẩm" className="flex h-full min-w-0 items-center overflow-x-auto">
            <ul className="flex items-center gap-5 whitespace-nowrap text-sm lg:gap-6">
              <li><Link href="/" className="hover:text-brand">Trang chủ</Link></li>
              {categories.map((category) => (
                <li key={category} className="flex items-center gap-5 lg:gap-6">
                  <span aria-hidden="true">·</span>
                  <span>{category}</span>
                </li>
              ))}
            </ul>
          </nav>
          <p className="hidden shrink-0 text-xs text-muted xl:block">Giao hàng toàn quốc · Hỗ trợ <a href="tel:1900636789" className="hover:text-brand">1900 636 789</a></p>
        </div>
      </div>
    </header>
  );
}
