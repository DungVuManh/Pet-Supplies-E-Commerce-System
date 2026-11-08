import { Suspense } from "react";
import { OrderDetailView } from "@/features/admin/components/order-detail-view";
import { getOrder } from "@/features/admin/services/orders.server";

type Params = PageProps<"/admin/orders/[orderCode]">["params"];

// URL params are read below a Suspense boundary so navigating from the list stays instant.
async function OrderDetail({ params }: { params: Params }) {
  return <OrderDetailView order={await getOrder((await params).orderCode)} />;
}

export default function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[orderCode]">) {
  return <Suspense fallback={<p role="status">Đang tải đơn hàng…</p>}><OrderDetail params={params} /></Suspense>;
}
