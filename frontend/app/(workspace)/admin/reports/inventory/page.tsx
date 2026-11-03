import { Suspense } from "react";
import { InventoryReportView } from "@/features/admin/components/inventory-report-view";
import { parseReportPeriod } from "@/features/admin/report-period";

export const metadata = {
  title: "Báo cáo tồn kho",
};

type SearchParams = PageProps<"/admin/reports/inventory">["searchParams"];

// The key starts a fresh view for each period, because Next keeps a visited route's state.
async function Report({ searchParams }: { searchParams: SearchParams }) {
  const period = parseReportPeriod(await searchParams);
  return <InventoryReportView key={`${period.from}_${period.to}`} period={period} />;
}

export default function AdminInventoryReportPage({ searchParams }: PageProps<"/admin/reports/inventory">) {
  return <Suspense fallback={<p role="status">Đang tải báo cáo tồn kho…</p>}><Report searchParams={searchParams} /></Suspense>;
}
