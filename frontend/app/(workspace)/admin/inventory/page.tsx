import { Suspense } from "react";
import { InventoryView } from "@/features/admin/components/inventory-view";

export const metadata = {
  title: "Danh sách tồn kho",
};

export default function AdminInventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Đang tải...</div>}>
      <InventoryView />
    </Suspense>
  );
}
