import type { Metadata } from "next";
import { OrderCancelView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Hủy đơn hàng | Petjoy",
  description: "Xác nhận và gửi yêu cầu hủy đơn hàng tại Petjoy.",
};

export default async function OrderCancelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <OrderCancelView orderId={id} />
    </main>
  );
}
