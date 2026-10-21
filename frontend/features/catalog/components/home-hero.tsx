import Image from "next/image";
import { buttonClassName } from "@/components/ui/button";
import companions from "@/public/images/pet-companions.png";

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero-title" className="flex flex-col items-center gap-6 rounded-2xl bg-brand-subtle px-5 py-5 md:flex-row md:gap-8 md:px-8 lg:h-[184px] lg:py-0">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        <p className="text-xs font-semibold text-brand">DÀNH CHO BẠN &amp; CÁC BÉ</p>
        <h2 id="home-hero-title" className="text-2xl font-normal leading-[normal] lg:text-[28px]">Bữa ngon cho bé. An tâm cho bạn.</h2>
        <p className="text-sm leading-relaxed text-muted">Khám phá dinh dưỡng chính hãng và những món đồ bé yêu thích.</p>
        <a href="#featured-products" className={buttonClassName}>
          <Image src="/icons/arrow-right.svg" width={20} height={20} alt="" />
          Khám phá sản phẩm
        </a>
      </div>
      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-2xl md:h-[184px] md:w-[344px]">
        <Image src={companions} alt="Chó Golden và mèo xám bên nhau trong căn phòng ấm áp" fill sizes="(min-width: 768px) 344px, calc(100vw - 88px)" preload className="object-cover" />
      </div>
    </section>
  );
}
