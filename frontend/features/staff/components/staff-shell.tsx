"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AccountMenu } from "@/features/auth/components/account-menu";

type StaffIcon =
 | "dashboard"
 | "orders"
 | "cancel"
 | "products"
 | "sales"
 | "performance";
const nav: { href: string; label: string; icon: StaffIcon }[] = [
 { href: "/staff/dashboard", label: "Tổng quan", icon: "dashboard" },
 { href: "/staff/orders", label: "Đơn hàng", icon: "orders" },
 {
  href: "/staff/orders?status=cancelled",
  label: "Yêu cầu hủy",
  icon: "cancel",
 },
 { href: "/staff/products", label: "Sản phẩm", icon: "products" },
 { href: "/staff/sales", label: "Doanh số", icon: "sales" },
 {
  href: "/staff/performance",
  label: "Hiệu suất cá nhân",
  icon: "performance",
 },
];

function StaffNavIcon({ name }: { name: StaffIcon }) {
 const paths: Record<StaffIcon, ReactNode> = {
  dashboard: (
   <>
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="15" y="3" width="6" height="6" rx="1" />
    <rect x="3" y="15" width="6" height="6" rx="1" />
    <rect x="15" y="15" width="6" height="6" rx="1" />
   </>
  ),
  orders: (
   <>
    <path d="M7 4h10v3H7z" />
    <path d="M6 5H5a2 2 0 0 0-2 2v13h18V7a2 2 0 0 0-2-2h-1" />
    <path d="M8 11h8M8 15h6" />
   </>
  ),
  cancel: (
   <>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6m0-6-6 6" />
   </>
  ),
  products: (
   <>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v9" />
   </>
  ),
  sales: (
   <>
    <path d="M4 20V10m5 10V4m6 16v-7m5 7V7" />
    <path d="M2 20h20" />
   </>
  ),
  performance: (
   <>
    <path d="M3 20h18M5 16l4-4 3 2 7-8" />
    <path d="M15 6h4v4" />
   </>
  ),
 };
 return (
  <svg
   viewBox="0 0 24 24"
   className="h-5 w-5 shrink-0 fill-none stroke-current stroke-[1.7]"
   aria-hidden="true"
  >
   {paths[name]}
  </svg>
 );
}
function active(pathname: string, cancelled: boolean, href: string) {
 const base = href.split("?")[0];
 if (href.includes("status=cancelled")) return pathname === base && cancelled;
 if (base === "/staff/orders") return pathname.startsWith(base) && !cancelled;
 return base === "/staff/dashboard"
  ? pathname === base
  : pathname.startsWith(base);
}

export function StaffShell({ children }: { children: ReactNode }) {
 const pathname = usePathname();
 const cancelled = useSearchParams().get("status") === "cancelled";
 const current =
  nav.find((item) => active(pathname, cancelled, item.href))?.label ||
  "Vận hành";
 return (
  <div
   data-workspace="staff"
   className="min-h-dvh max-w-full overflow-x-clip bg-surface lg:grid lg:grid-cols-[232px_minmax(0,1fr)]"
  >
   <aside
    className="hidden min-h-dvh border-r border-line bg-surface px-6 py-7 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col"
    aria-label="Điều hướng nhân viên"
   >
    <Link
     href="/staff/dashboard"
     className="text-[32px] font-bold tracking-[-1px] text-brand"
    >
     petjoy
    </Link>
    <p className="mt-8 text-xs uppercase text-muted">Quản lý cửa hàng</p>
    <nav className="mt-3 space-y-2">
     {nav.map((item) => (
      <Link
       key={item.href}
       href={item.href}
       aria-current={active(pathname, cancelled, item.href) ? "page" : undefined}
       className={`flex min-h-12 items-center gap-3 rounded-lg px-2 font-medium ${active(pathname, cancelled, item.href) ? "bg-brand-subtle text-brand" : "hover:bg-canvas"}`}
      >
       <StaffNavIcon name={item.icon} />
       {item.label}
      </Link>
     ))}
    </nav>
    <div className="mt-6 border-t border-line pt-6">
     <p className="font-semibold">Thông tin ca làm</p>
     <p className="mt-2 text-xs text-muted">Chưa có dữ liệu ca làm trong hệ thống.</p>
    </div>
    <div className="mt-auto pt-6 text-xs text-muted">
     <p>Hướng dẫn vận hành</p>
     <p className="mt-2">Petjoy Staff · phiên bản 1.0</p>
    </div>
   </aside>
   <div className="min-w-0">
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
     <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-8">
      <div className="min-w-0">
       <p className="truncate">
        <span className="text-muted">Vận hành</span>
        <span className="px-3 text-muted">/</span>
        <strong>{current}</strong>
       </p>
      </div>
      <div className="flex items-center gap-4">
       <AccountMenu />
      </div>
     </div>
     <details className="border-t border-line px-4 py-3 lg:hidden">
      <summary className="cursor-pointer font-semibold text-brand">
       Menu vận hành
      </summary>
      <nav className="mt-3 grid gap-2 sm:grid-cols-2">
       {nav.map((item) => (
        <Link
         key={item.href}
         href={item.href}
         aria-current={active(pathname, cancelled, item.href) ? "page" : undefined}
         className={`rounded-lg px-3 py-3 ${active(pathname, cancelled, item.href) ? "bg-brand-subtle text-brand" : "bg-canvas"}`}
        >
         {item.label}
        </Link>
       ))}
      </nav>
     </details>
    </header>
    <main className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-8 sm:px-8 lg:py-10">
     {children}
    </main>
   </div>
  </div>
 );
}
