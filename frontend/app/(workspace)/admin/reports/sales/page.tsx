import { Suspense } from "react";
import { SalesReportView } from "@/features/admin/components/sales-report-view";
import { parseReportPeriod } from "@/features/admin/report-period";

export const metadata = {
  title: "Báo cáo bán hàng",
};

type SearchParams = PageProps<"/admin/reports/sales">["searchParams"];

// The key starts a fresh view for each period, because Next keeps a visited route's state.
async function Report({ searchParams }: { searchParams: SearchParams }) {
  const period = parseReportPeriod(await searchParams);
  return <SalesReportView key={`${period.from}_${period.to}`} period={period} />;
}

export default function AdminSalesReportPage({ searchParams }: PageProps<"/admin/reports/sales">) {
  return <Suspense fallback={<p role="status">Đang tải báo cáo bán hàng…</p>}><Report searchParams={searchParams} /></Suspense>;
}
