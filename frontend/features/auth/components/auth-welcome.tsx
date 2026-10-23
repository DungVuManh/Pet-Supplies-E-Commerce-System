import Image from "next/image";
import companions from "@/public/images/pet-companions.png";

const benefits = [
  "Theo dõi đơn hàng, mua sắm thuận tiện",
  "Lưu hồ sơ thú cưng và địa chỉ giao hàng",
  "Nhận ưu đãi phù hợp cho bạn và các bé",
];

export function AuthWelcome() {
  return (
    <aside className="hidden flex-col gap-6 lg:flex" aria-label="Đồng hành cùng Petjoy">
      <Image src={companions} alt="Chó Golden và mèo xám bên nhau trong căn phòng ấm áp" width={520} height={278} sizes="(min-width: 1280px) 520px, (min-width: 1024px) calc((100vw - 96px) / 2), 520px" preload className="aspect-[520/278] h-auto w-full rounded-2xl object-cover" />
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-brand">DÀNH RIÊNG CHO BẠN &amp; CÁC BÉ</p>
        <h2 className="text-[28px] font-normal leading-[normal]">Chăm sóc trọn vẹn, yêu thương mỗi ngày.</h2>
        <p className="text-sm leading-[1.6] text-muted">Cùng Petjoy chọn những điều tốt nhất cho người bạn nhỏ của bạn.</p>
      </div>
      <ul className="flex flex-col gap-4">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-center gap-3">
            <Image src="/icons/circle-check.svg" width={20} height={20} alt="" className="shrink-0" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
