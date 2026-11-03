import type { Metadata } from "next";
import { VoucherView } from "@/features/vouchers";

export const metadata: Metadata = {
  title: "Mã giảm giá | Petjoy",
  description: "Lưu về ví, dùng khi thanh toán. Tổng hợp các mã giảm giá toàn sàn, mã miễn phí vận chuyển và ưu đãi sản phẩm tại Petjoy.",
};

export default function VoucherPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <VoucherView />
    </main>
  );
}

