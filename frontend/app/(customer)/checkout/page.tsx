import type { Metadata } from "next";
import { CheckoutView } from "@/features/checkout";

export const metadata: Metadata = {
  title: "Thanh toán | Petjoy",
  description: "Kiểm tra thông tin giao hàng và hoàn tất đơn mua của bạn tại Petjoy.",
};

export default function CheckoutPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-8 outline-none xl:px-16"
    >
      <CheckoutView />
    </main>
  );
}
