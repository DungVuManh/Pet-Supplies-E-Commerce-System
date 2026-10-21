import { WorkspaceDashboard } from "@/features/workspace/components/workspace-dashboard";

export const metadata = { title: "Dashboard quản trị" };

export default function AdminDashboardPage() {
  return <WorkspaceDashboard role="admin" />;
}
