import type { Metadata } from "next";
import { OrdersView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Đơn hàng của tôi | Petjoy",
  description: "Theo dõi hành trình giao hàng và quản lý các đơn mua của bạn.",
};

export default function OrdersPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <OrdersView />
    </main>
  );
}
