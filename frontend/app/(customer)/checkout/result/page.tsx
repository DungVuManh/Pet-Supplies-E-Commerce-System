import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentResultView } from "@/features/checkout/components/payment-result-view";

export const metadata: Metadata = {
  title: "Kết quả đặt hàng | Petjoy",
  description: "Trạng thái giao dịch đơn hàng tại Petjoy.",
};

export default function CheckoutResultPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-8 outline-none xl:px-16"
    >
      <Suspense fallback={<div className="p-12 text-center text-muted">Đang tải kết quả đơn hàng...</div>}>
        <PaymentResultView />
      </Suspense>
    </main>
  );
}
