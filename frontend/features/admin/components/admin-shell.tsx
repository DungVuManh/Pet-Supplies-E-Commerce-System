"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Bell, ChartNoAxesCombined, Database, LayoutGrid, ListTree, Package, PawPrint, RotateCcw, Search, Settings, ShoppingBag, Users, Warehouse,
  type LucideIcon,
} from "lucide-react";
import { AccountMenu } from "@/features/auth/components/account-menu";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutGrid },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/categories", label: "Danh mục", icon: ListTree },
  { href: "/admin/master-data", label: "Dữ liệu nền", icon: Database },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingBag },
  { href: "/admin/cancellations", label: "Yêu cầu hủy", icon: RotateCcw },
  { href: "/admin/inventory", label: "Kho hàng", icon: Warehouse },
  { href: "/admin/reports", label: "Báo cáo", icon: ChartNoAxesCombined },
  { href: "/admin/notifications", label: "Thông báo", icon: Bell },
  { href: "/admin/system", label: "Hệ thống", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-[26px] font-bold tracking-[-0.5px] text-brand">
    <PawPrint className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />petly
  </Link>;
}

function GlobalSearch() {
  const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Tìm kiếm toàn hệ thống chưa kết nối backend.");
  }
  return <form role="search" onSubmit={submit} className="relative hidden min-w-0 max-w-[640px] flex-1 md:block">
    <label htmlFor="admin-search" className="sr-only">Tìm kiếm trong hệ thống</label>
    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
    <input id="admin-search" type="search" placeholder="Tìm kiếm trong hệ thống..." onChange={() => setNotice("")}
      className="h-12 w-full rounded-lg border border-line bg-canvas pl-12 pr-4 focus:border-brand" />
    {notice && <p role="status" className="absolute left-0 top-full mt-1 text-xs text-brand">{notice}</p>}
  </form>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const links = nav.map((item) => ({ ...item, active: isActive(pathname, item.href) }));
  return <div data-workspace="admin" className="min-h-dvh max-w-full overflow-x-clip bg-canvas lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
    <aside className="hidden border-r border-line bg-surface px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto" aria-label="Điều hướng quản trị">
      <div className="px-2"><Logo /></div>
      <div className="mt-12 px-2"><p className="text-xs uppercase text-muted">Không gian quản trị</p><p className="mt-2 font-semibold">Pet Supplies</p></div>
      <nav className="mt-6"><ul className="space-y-2">{links.map(({ href, label, icon: Icon, active }) => <li key={href}>
        <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-lg px-4 text-[15px] ${active ? "bg-brand-subtle font-semibold text-brand" : "text-muted hover:bg-canvas hover:text-ink"}`}>
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.7} aria-hidden="true" />{label}
        </Link>
      </li>)}</ul></nav>
      <div className="mt-8 px-4 text-xs text-muted">
        <span className="inline-flex rounded-full bg-success-subtle px-2 py-1.5 font-semibold text-success">Hệ thống ổn định</span>
        <p className="mt-3">Phiên bản 2.4 · 12/10/2026</p>
      </div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="flex min-h-20 items-center gap-6 px-4 sm:px-8">
          <Link href="/admin/dashboard" className="shrink-0 text-xl font-bold tracking-[-0.5px] text-brand">petly / admin</Link>
          <GlobalSearch />
          <div className="ml-auto flex shrink-0 items-center gap-4 sm:gap-8">
            <Link href="/admin/notifications" className="hidden text-brand hover:underline sm:inline">Thông báo</Link>
            <a href="mailto:support@petly.vn" className="hidden hover:text-brand sm:inline">Hỗ trợ</a>
            <AccountMenu roleLabel="Admin" />
          </div>
        </div>
        <details className="border-t border-line px-4 py-3 lg:hidden">
          <summary className="cursor-pointer font-semibold text-brand">Menu quản trị</summary>
          <nav className="mt-3" aria-label="Điều hướng quản trị trên thiết bị nhỏ"><ul className="grid gap-2 sm:grid-cols-2">{links.map(({ href, label, icon: Icon, active }) => <li key={href}>
            <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 ${active ? "bg-brand-subtle font-semibold text-brand" : "bg-canvas"}`}>
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.7} aria-hidden="true" />{label}
            </Link>
          </li>)}</ul></nav>
        </details>
      </header>
      <main className="w-full max-w-[1216px] space-y-6 px-4 py-8 sm:px-8">{children}</main>
    </div>
  </div>;
}
