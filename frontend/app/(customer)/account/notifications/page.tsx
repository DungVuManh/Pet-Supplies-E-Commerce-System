import type { Metadata } from "next";
import { NotificationsView } from "@/features/notifications/components/notifications-view";

export const metadata: Metadata = {
  title: "Thông báo của tôi | Petjoy",
  description: "Trung tâm cập nhật thông báo đơn hàng và ưu đãi của bạn tại Petjoy.",
};

export default function NotificationsPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <NotificationsView />
    </main>
  );
}

