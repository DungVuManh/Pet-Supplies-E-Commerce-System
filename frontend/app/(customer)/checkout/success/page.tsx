import type { Metadata } from "next";
import { OrderSuccessView } from "@/features/checkout/components/order-success-view";

export const metadata: Metadata = {
  title: "Cảm ơn đã đặt hàng | Petjoy",
  description: "Đơn hàng của bạn đã được ghi nhận thành công tại Petjoy.",
};

export default function OrderSuccessPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-8 outline-none xl:px-16"
    >
      <OrderSuccessView />
    </main>
  );
}
