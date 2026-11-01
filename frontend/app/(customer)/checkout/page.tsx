import type { Metadata } from "next";
import { Suspense } from "react";
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
      <Suspense
        fallback={
          <div className="w-full py-24 text-center">
            <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-sm text-muted">Đang tải trang thanh toán...</p>
          </div>
        }
      >
        <CheckoutView />
      </Suspense>
    </main>
  );
}
