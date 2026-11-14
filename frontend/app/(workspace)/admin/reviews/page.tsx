import { Suspense } from "react";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";
import { ReviewsList } from "@/features/admin/components/reviews-list";

export const metadata = { title: "Đánh giá" };

export default function AdminReviewsPage() {
  return <>
    <AdminPageHeader breadcrumbs={["Đánh giá", "Đánh giá sản phẩm"]} title="Đánh giá sản phẩm" subtitle="Xem và xóa đánh giá có nội dung không phù hợp." />
    <Suspense fallback={<p role="status">Đang tải đánh giá…</p>}><ReviewsList /></Suspense>
  </>;
}
