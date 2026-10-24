import { Suspense } from "react";
import { OrdersList } from "@/features/staff/components/orders-list";
export const metadata = { title: "Đơn hàng" };
export default function OrdersPage() {
 return (
  <Suspense fallback={<p role="status">Đang tải danh sách đơn hàng…</p>}>
   <OrdersList />
  </Suspense>
 );
}
