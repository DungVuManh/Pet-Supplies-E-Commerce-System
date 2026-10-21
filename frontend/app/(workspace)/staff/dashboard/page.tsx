import { WorkspaceDashboard } from "@/features/workspace/components/workspace-dashboard";

export const metadata = { title: "Dashboard nhân viên" };

export default function StaffDashboardPage() {
  return <WorkspaceDashboard role="staff" />;
}
