import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderResumePaymentView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Tiếp tục thanh toán đơn hàng | Petjoy",
  description:
    "Quét mã VietQR để hoàn tất thanh toán trực tuyến cho đơn hàng tại Petjoy.",
};

async function OrderResumePaymentContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderResumePaymentView orderId={id} />;
}

export default function OrderPayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <Suspense
        fallback={
          <div className="p-8 text-center text-sm text-muted">
            Đang tải thông tin thanh toán...
          </div>
        }
      >
        <OrderResumePaymentContent params={params} />
      </Suspense>
    </main>
  );
}

