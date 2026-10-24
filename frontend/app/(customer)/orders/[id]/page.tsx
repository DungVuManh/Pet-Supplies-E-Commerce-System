import type { Metadata } from "next";
import { OrderDetailView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng | Petjoy",
  description: "Xem chi tiết đơn hàng và theo dõi trạng thái giao hàng của bạn.",
};

export default async function OrderDetailPage({
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
      <OrderDetailView orderId={id} />
    </main>
  );
}
