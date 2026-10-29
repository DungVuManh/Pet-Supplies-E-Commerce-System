import { Truck, ShieldCheck, Gift, RotateCcw, Headset } from "lucide-react";

const POLICIES = [
  {
    icon: Truck,
    title: "Giao siêu tốc 2H",
    description: "Nội thành & giao nhanh toàn quốc",
  },
  {
    icon: ShieldCheck,
    title: "100% Chính hãng",
    description: "Đầy đủ hoá đơn & nguồn gốc rõ ràng",
  },
  {
    icon: Gift,
    title: "Tích điểm đổi quà",
    description: "Tiết kiệm đến 25% cho thành viên",
  },
  {
    icon: RotateCcw,
    title: "Đổi trả 7 ngày",
    description: "Đổi trả linh hoạt khi lỗi sản phẩm",
  },
  {
    icon: Headset,
    title: "Tư vấn tận tâm",
    description: "Đội ngũ chuyên viên dinh dưỡng",
  },
] as const;

export function ServicePolicyBar() {
  return (
    <section aria-label="Cam kết dịch vụ" className="w-full">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {POLICIES.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-brand/40"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink leading-snug truncate sm:text-sm">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted leading-relaxed line-clamp-1">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
