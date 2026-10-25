import { Suspense } from "react";
import { OrdersView } from "@/features/admin/components/orders-view";

export const metadata = { title: "Danh sách đơn hàng" };

export default function AdminOrdersPage() {
  return <Suspense fallback={<p role="status">Đang tải danh sách đơn hàng…</p>}><OrdersView /></Suspense>;
}
