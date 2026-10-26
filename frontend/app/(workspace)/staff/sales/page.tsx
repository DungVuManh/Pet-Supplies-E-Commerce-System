import { Suspense } from "react";
import { SalesView } from "@/features/staff/analytics/components/sales-view";
import { ReportLoading } from "@/features/staff/analytics/components/report-state";

export const metadata = { title: "Doanh số" };
export default function SalesPage() {
  return <Suspense fallback={<ReportLoading />}><SalesView /></Suspense>;
}
