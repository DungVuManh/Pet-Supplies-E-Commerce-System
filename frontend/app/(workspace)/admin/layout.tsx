import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/features/auth/auth-provider";
import { requireDashboardUser } from "@/features/auth/server";
import { AdminShell } from "@/features/admin/components/admin-shell";

// The session check runs per request; keeping it inside this segment's Suspense lets client
// navigations into /admin show the fallback instead of blocking on the backend round trip.
async function AdminSession({ children }: { children: ReactNode }) {
  const user = await requireDashboardUser("admin");
  return <AuthProvider initialUser={user}><AdminShell>{children}</AdminShell></AuthProvider>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main data-workspace="admin" className="min-h-dvh bg-canvas p-8" aria-busy="true"><p role="status">Đang kiểm tra quyền truy cập…</p></main>}>
    <AdminSession>{children}</AdminSession>
  </Suspense>;
}
