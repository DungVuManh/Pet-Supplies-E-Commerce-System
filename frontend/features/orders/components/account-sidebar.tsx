"use client";

// =============================================================
// features/orders/components/account-sidebar.tsx
// Sidebar thông tin tài khoản & menu điều hướng bên trái
// =============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const NAV_ITEMS = [
  { label: "Thông tin cá nhân", href: "/account" },
  { label: "Đơn hàng của tôi", href: "/orders" },
  { label: "Danh sách yêu thích", href: "/wishlist" },
  { label: "Đánh giá của tôi", href: "/reviews" },
  { label: "Sổ địa chỉ", href: "#" },
  { label: "Thú cưng của tôi", href: "#" },
  { label: "Thông báo", href: "#" },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 shrink-0 flex flex-col justify-between">
      <div>
        {/* Danh sách menu tài khoản */}
        <nav aria-label="Menu tài khoản" className="space-y-4 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href !== "#" && (pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href)));

            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className={
                    isActive
                      ? "text-blue-600 font-semibold flex items-center gap-1.5 transition-colors"
                      : "text-muted hover:text-ink transition-colors block"
                  }
                >
                  {isActive && <span>→</span>}
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Đường dẫn hỗ trợ ở dưới */}
      <div className="mt-12 pt-6 border-t border-line/40">
        <a
          href="tel:1900636789"
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          Trợ giúp · 1900 636 789
        </a>
      </div>
    </aside>
  );
}
