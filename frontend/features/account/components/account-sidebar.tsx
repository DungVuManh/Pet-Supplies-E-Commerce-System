"use client";

// =============================================================
// features/account/components/account-sidebar.tsx
// Sidebar thông tin tài khoản & menu điều hướng bên trái
// Bám chuẩn UI thiết kế: chữ xanh bold có mũi tên khi active,
// chữ xám trung tính khi inactive, link hỗ trợ ở chân sidebar
// =============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { ACCOUNT_NAV_ITEMS, isNavItemActive } from "../constants";

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 shrink-0 flex flex-col justify-between">
      <div>
        {/* Danh sách menu tài khoản */}
        <nav aria-label="Menu tài khoản" className="space-y-4 text-sm font-medium">
          {ACCOUNT_NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item, pathname);

            return (
              <div key={item.id}>
                <Link
                  href={item.href}
                  className={
                    isActive
                      ? "text-blue-600 font-bold flex items-center gap-1.5 transition-colors"
                      : "text-slate-600 hover:text-ink font-medium transition-colors block"
                  }
                >
                  {isActive && <span className="font-bold">→</span>}
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Đường dẫn hỗ trợ ở dưới chân sidebar */}
      <div className="mt-16 pt-6 border-t border-line/40">
        <Link
          href="/support"
          className="text-xs text-brand hover:underline font-medium inline-block"
        >
          Trung tâm hỗ trợ →
        </Link>
      </div>
    </aside>
  );
}

