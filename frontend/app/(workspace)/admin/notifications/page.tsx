import { Suspense } from "react";
import { NotificationsView } from "@/features/admin/components/notifications-view";

export const metadata = {
  title: "Thông báo",
};

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Đang tải...</div>}>
      <NotificationsView />
    </Suspense>
  );
}
