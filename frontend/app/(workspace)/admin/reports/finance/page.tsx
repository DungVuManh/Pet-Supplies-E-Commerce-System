import { Suspense } from "react";
import { FinanceReportView } from "@/features/admin/components/finance-report-view";
import { parseReportPeriod } from "@/features/admin/report-period";

export const metadata = {
  title: "Báo cáo tài chính",
};

type SearchParams = PageProps<"/admin/reports/finance">["searchParams"];

// The key starts a fresh view for each period, because Next keeps a visited route's state.
async function Report({ searchParams }: { searchParams: SearchParams }) {
  const period = parseReportPeriod(await searchParams);
  return <FinanceReportView key={`${period.from}_${period.to}`} period={period} />;
}

export default function AdminFinanceReportPage({ searchParams }: PageProps<"/admin/reports/finance">) {
  return <Suspense fallback={<p role="status">Đang tải báo cáo tài chính…</p>}><Report searchParams={searchParams} /></Suspense>;
}
