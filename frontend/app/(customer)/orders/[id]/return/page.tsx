import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderReturnView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Yêu cầu hoàn trả đơn hàng | Petjoy",
  description: "Gửi yêu cầu hoàn trả đơn hàng kèm hình ảnh minh chứng tại Petjoy.",
};

async function OrderReturnContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderReturnView orderId={id} />;
}

export default function OrderReturnPage({
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
        <OrderReturnContent params={params} />
      </Suspense>
    </main>
  );
}

