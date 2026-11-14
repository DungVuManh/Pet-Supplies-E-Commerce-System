import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderCancelView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Hủy đơn hàng | Petjoy",
  description: "Xác nhận và gửi yêu cầu hủy đơn hàng tại Petjoy.",
};

async function OrderCancelContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderCancelView orderId={id} />;
}

export default function OrderCancelPage({
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
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted">Đang tải...</div>}>
        <OrderCancelContent params={params} />
      </Suspense>
    </main>
  );
}
