import type { Metadata } from "next";
import { OrderTrackingView } from "@/features/orders/components/order-tracking-view";

export const metadata: Metadata = {
  title: "Tra cứu đơn hàng | Petjoy",
  description: "Tra cứu tình trạng đơn hàng và tiến độ vận chuyển dễ dàng, nhanh chóng.",
};

export default function OrderTrackingPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <OrderTrackingView />
    </main>
  );
}
