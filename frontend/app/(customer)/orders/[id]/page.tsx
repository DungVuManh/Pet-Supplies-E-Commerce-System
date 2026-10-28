import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetailView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng | Petjoy",
  description: "Xem chi tiết đơn hàng và theo dõi trạng thái giao hàng của bạn.",
};

type OrderParams = Promise<{ id: string }>;

// params is runtime data, so it is read inside Suspense (Next 16 Cache Components).
export default function OrderDetailPage({ params }: { params: OrderParams }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted">Đang tải chi tiết đơn hàng...</div>}>
        <OrderDetailViewFromParams params={params} />
      </Suspense>
    </main>
  );
}

async function OrderDetailViewFromParams({ params }: { params: OrderParams }) {
  const { id } = await params;
  return <OrderDetailView orderId={id} />;
}
