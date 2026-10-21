import Link from "next/link";
import { AuthProvider } from "@/features/auth/auth-provider";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { requireDashboardUser } from "@/features/auth/server";
import type { Role } from "@/features/auth/types";

export async function WorkspaceDashboard({ role }: { role: Exclude<Role, "customer"> }) {
  const user = await requireDashboardUser(role);
  const label = role === "staff" ? "Nhân viên" : "Quản trị";
  return <AuthProvider initialUser={user}>
    <div data-workspace={role} className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <Link href="/" className="text-[32px] font-bold tracking-[-1px] text-brand">Petly</Link>
          <div className="flex items-center gap-4">
            <span className="rounded-lg bg-brand-subtle px-3 py-2 text-xs font-semibold text-brand">{label}</span>
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand">Không gian {label.toLowerCase()}</p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.8px]">Dashboard {label.toLowerCase()}</h1>
          </div>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold text-brand hover:bg-brand-subtle">Về cửa hàng</Link>
        </div>
        <section aria-labelledby="workspace-profile" className="rounded-lg border border-line bg-surface p-6">
          <h2 id="workspace-profile" className="text-xl font-semibold">Thông tin tài khoản</h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="min-w-0"><dt className="text-sm text-muted">Họ và tên</dt><dd className="mt-2 break-words font-semibold">{user.fullName}</dd></div>
            <div className="min-w-0"><dt className="text-sm text-muted">Email</dt><dd className="mt-2 break-all">{user.email}</dd></div>
            <div><dt className="text-sm text-muted">Vai trò</dt><dd className="mt-2">{label}</dd></div>
            <div className="min-w-0"><dt className="text-sm text-muted">Số điện thoại</dt><dd className="mt-2 break-words">{user.phone}</dd></div>
          </dl>
        </section>
        <section aria-labelledby="workspace-empty" className="rounded-lg border border-line bg-surface p-6">
          <h2 id="workspace-empty" className="text-xl font-semibold">Chưa có dữ liệu nghiệp vụ</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{role === "staff"
            ? "Các chức năng xử lý đơn hàng và xem tồn kho sẽ được bổ sung trong các đợt tiếp theo."
            : "Các chức năng quản lý sản phẩm, tài khoản và báo cáo sẽ được bổ sung trong các đợt tiếp theo."}</p>
        </section>
      </main>
    </div>
  </AuthProvider>;
}
