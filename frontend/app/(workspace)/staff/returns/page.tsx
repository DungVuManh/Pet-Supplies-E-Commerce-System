import { Suspense } from "react";
import { ReturnsList } from "@/features/staff/components/returns-list";

export const metadata = { title: "Yêu cầu hoàn trả | Staff Petjoy" };

export default function StaffReturnsPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-center text-sm text-ink-muted">Đang tải danh sách yêu cầu hoàn trả…</p>}>
      <ReturnsList />
    </Suspense>
  );
}

