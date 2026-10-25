import { Suspense } from "react";
import { MasterDataView } from "@/features/admin/components/master-data-view";

export const metadata = { title: "Dữ liệu nền" };

export default function AdminMasterDataPage() {
  return <Suspense fallback={<p role="status">Đang tải dữ liệu nền…</p>}><MasterDataView /></Suspense>;
}
