import { Suspense } from "react";
import { PerformanceView } from "@/features/staff/analytics/components/performance-view";
import { ReportLoading } from "@/features/staff/analytics/components/report-state";

export const metadata = { title: "Hiệu suất cá nhân" };
export default function PerformancePage() {
  return <Suspense fallback={<ReportLoading />}><PerformanceView /></Suspense>;
}
