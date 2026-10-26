import { Suspense } from "react";
import { OverviewView } from "@/features/staff/analytics/components/overview-view";
import { ReportLoading } from "@/features/staff/analytics/components/report-state";

export const metadata = { title: "Tổng quan vận hành" };
export default function StaffDashboardPage() {
  return <Suspense fallback={<ReportLoading />}><OverviewView /></Suspense>;
}
