import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, Dog, Cat } from "lucide-react";
import companions from "@/public/images/pet-companions.png";

export function HeroBannerGrid() {
 return (
  <section
   aria-label="Khuyến mãi nổi bật"
   className="grid grid-cols-1 gap-4 lg:grid-cols-12"
  >
   {/* 1. Banner chính (8 cột trên desktop) */}
   <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-brand-subtle p-6 sm:p-8 lg:col-span-8 lg:min-h-[260px] md:flex-row md:items-center">
    <div className="z-10 flex max-w-md flex-col items-start gap-3">
     <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-brand shadow-xs border border-brand/20">
      <Sparkles className="size-3.5" />
      SIÊU THỊ THÚ CƯNG PETJOY
     </span>
     <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
      Bữa ngon cho bé. <br className="hidden sm:inline" />
      An tâm cho bạn.
     </h2>
     <p className="text-xs sm:text-sm text-muted leading-relaxed">
      Hơn 500+ sản phẩm dinh dưỡng, phụ kiện & chăm sóc chính hãng từ các thương
      hiệu hàng đầu.
     </p>
     <div className="mt-1 flex flex-wrap items-center gap-3">
      <Link
       href="#featured-products"
       className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-brand"
      >
       Khám phá sản phẩm
       <ArrowRight className="size-4" />
      </Link>
      <Link
       href="/listProduct/allProducts"
       className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
      >
       Xem tất cả
      </Link>
     </div>
    </div>

    {/* Ảnh minh họa bên phải */}
    <div className="relative mt-4 h-44 w-full shrink-0 overflow-hidden rounded-2xl md:mt-0 md:h-52 md:w-64 lg:w-72">
     <Image
      src={companions}
      alt="Chó và mèo cưng bên nhau"
      fill
      sizes="(min-width: 1024px) 288px, (min-width: 768px) 256px, 100vw"
      priority
      className="object-cover"
     />
    </div>
   </div>

   {/* 2. Hai banner phụ (4 cột trên desktop - tham khảo cấu trúc Paddy.vn) */}
   <div className="flex flex-col gap-4 lg:col-span-4">
    {/* Banner phụ 1: Dành cho Cún */}
    <Link
     href="/listProduct/allProducts?petType=dog"
     className="group flex flex-1 flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-all hover:border-brand/50 hover:bg-canvas"
    >
     <div className="flex items-start justify-between gap-3">
      <div>
       <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
        <Dog className="size-3.5" />
        Dành riêng cho Cún
       </span>
       <h3 className="mt-1 text-base font-semibold text-ink group-hover:text-brand transition-colors">
        Hạt & Bánh thưởng chất lượng
       </h3>
       <p className="mt-1 text-xs text-muted">
        Bảo vệ xương khớp & hệ tiêu hoá khoẻ mạnh
       </p>
      </div>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand transition-transform group-hover:translate-x-0.5">
       <ArrowRight className="size-4" />
      </span>
     </div>
     <span className="mt-3 text-[11px] font-medium text-brand">
      Xem danh mục Cún →
     </span>
    </Link>

    {/* Banner phụ 2: Dành cho Mèo */}
    <Link
     href="/listProduct/allProducts?petType=cat"
     className="group flex flex-1 flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-all hover:border-brand/50 hover:bg-canvas"
    >
     <div className="flex items-start justify-between gap-3">
      <div>
       <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
        <Cat className="size-3.5" />
        Chiều chuộng bé Mèo
       </span>
       <h3 className="mt-1 text-base font-semibold text-ink group-hover:text-brand transition-colors">
        Pate, Súp thưởng & Cát vệ sinh
       </h3>
       <p className="mt-1 text-xs text-muted">
        Khử mùi hiệu quả, dinh dưỡng bóng lông
       </p>
      </div>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand transition-transform group-hover:translate-x-0.5">
       <ArrowRight className="size-4" />
      </span>
     </div>
     <span className="mt-3 text-[11px] font-medium text-brand">
      Xem danh mục Mèo →
     </span>
    </Link>
   </div>
  </section>
 );
}
