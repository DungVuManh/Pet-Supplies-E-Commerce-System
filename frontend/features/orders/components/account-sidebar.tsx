"use client";

// =============================================================
// features/orders/components/account-sidebar.tsx
// Sidebar thông tin tài khoản & menu điều hướng bên trái
// Bám chuẩn UI thiết kế: chữ xanh bold có mũi tên khi active,
// chữ xám trung tính khi inactive, link hỗ trợ ở chân sidebar
// =============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const NAV_ITEMS = [
  { label: "Thông tin cá nhân", href: "/account/profile" },
  { label: "Đơn hàng ", href: "/orders" },
  { label: "Ví voucher", href: "/account/vouchers" },
  { label: "Đánh giá ", href: "/reviews" },
  { label: "Sản phẩm yêu thích", href: "/account/wishlist" },
  { label: "Sổ địa chỉ", href: "/account/addresses" },
  { label: "Thú cưng của tôi", href: "/account/pets" },
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
            const isActive = (() => {
              if (item.href === "#") return false;
              if (item.href === "/account/profile") {
                return (
                  pathname === "/account" || pathname?.startsWith("/account/profile")
                );
              }
              if (item.href === "/account/wishlist") {
                return (
                  pathname === "/wishlist" || pathname?.startsWith("/account/wishlist")
                );
              }
              return (
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href))
              );
            })();

            return (
              <div key={item.label}>
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
        <Link href="/support" className="text-xs text-brand hover:underline font-medium inline-block">
          Trung tâm hỗ trợ →
        </Link>
      </div>
    </aside>
  );
}
