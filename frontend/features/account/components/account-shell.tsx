"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AccountSidebar } from "@/features/orders/components/account-sidebar";
import { ChevronRight } from "lucide-react";

interface AccountShellProps {
  activeTab: "profile" | "addresses" | "pets" | "orders" | "wishlist";
  children: ReactNode;
}

export function AccountShell({ activeTab, children }: AccountShellProps) {
  const tabLabels = {
    profile: "Thông tin cá nhân",
    addresses: "Sổ địa chỉ",
    pets: "Thú cưng của tôi",
    orders: "Đơn hàng của tôi",
    wishlist: "Sản phẩm yêu thích",
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Đường dẫn"
        className="mb-6 flex items-center gap-1.5 text-xs text-muted"
      >
        <Link href="/" className="hover:text-brand transition-colors">
          Trang chủ
        </Link>

        <ChevronRight className="size-3.5 text-slate-400" />

        <Link
          href="/account/profile"
          className="hover:text-brand transition-colors"
        >
          Tài khoản
        </Link>

        <ChevronRight className="size-3.5 text-slate-400" />

        <span className="font-semibold text-ink">
          {tabLabels[activeTab]}
        </span>
      </nav>

      {/* Layout 2 cột */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        <AccountSidebar />

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
