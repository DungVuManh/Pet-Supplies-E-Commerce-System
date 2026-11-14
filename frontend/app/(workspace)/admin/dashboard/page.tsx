import { Suspense } from "react";
import { OverviewView } from "@/features/admin/components/overview-view";
import { parseOverviewPreset } from "@/features/admin/overview";
import { getOverview } from "@/features/admin/services/overview.server";

export const metadata = { title: "Tổng quan kinh doanh" };

type SearchParams = PageProps<"/admin/dashboard">["searchParams"];

// The URL and cookies are read below a Suspense boundary so navigating here stays instant.
async function Overview({ searchParams }: { searchParams: SearchParams }) {
  const preset = parseOverviewPreset((await searchParams).period);
  return <OverviewView overview={await getOverview(preset)} preset={preset} />;
}

export default function AdminDashboardPage({ searchParams }: PageProps<"/admin/dashboard">) {
  return <Suspense fallback={<p role="status">Đang tải tổng quan kinh doanh…</p>}><Overview searchParams={searchParams} /></Suspense>;
}
