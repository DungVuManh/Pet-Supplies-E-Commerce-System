import type { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/auth-provider";
import { requireDashboardUser } from "@/features/auth/server";
import { StaffShell } from "@/features/staff/components/staff-shell";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requireDashboardUser("staff");
  return <AuthProvider initialUser={user}><StaffShell>{children}</StaffShell></AuthProvider>;
}
