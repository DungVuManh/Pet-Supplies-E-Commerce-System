import { Suspense } from "react";
import { CancellationsView } from "@/features/admin/components/cancellations-view";

export const metadata = {
  title: "Yêu cầu hủy đơn",
};

export default function AdminCancellationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Đang tải...</div>}>
      <CancellationsView />
    </Suspense>
  );
}
