import type { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/auth-provider";
import { requireDashboardUser } from "@/features/auth/server";
import { AdminShell } from "@/features/admin/components/admin-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireDashboardUser("admin");
  return <AuthProvider initialUser={user}><AdminShell>{children}</AdminShell></AuthProvider>;
}
