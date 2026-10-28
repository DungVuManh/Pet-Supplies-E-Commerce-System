import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderCancelView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Hủy đơn hàng | Petjoy",
  description: "Xác nhận và gửi yêu cầu hủy đơn hàng tại Petjoy.",
};

type OrderParams = Promise<{ id: string }>;

// params is runtime data, so it is read inside Suspense (Next 16 Cache Components).
export default function OrderCancelPage({ params }: { params: OrderParams }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted">Đang tải đơn hàng...</div>}>
        <OrderCancelViewFromParams params={params} />
      </Suspense>
    </main>
  );
}

async function OrderCancelViewFromParams({ params }: { params: OrderParams }) {
  const { id } = await params;
  return <OrderCancelView orderId={id} />;
}
