"use client";

// =============================================================
// features/orders/components/account-sidebar.tsx
// Sidebar thông tin tài khoản & menu điều hướng bên trái
// =============================================================

import Link from "next/link";
import React from "react";
import { MOCK_CUSTOMER_PROFILE } from "../mock-data";

export function AccountSidebar() {
  const profile = MOCK_CUSTOMER_PROFILE;

  return (
    <aside className="w-full md:w-64 shrink-0 flex flex-col justify-between">
      <div>
        {/* Thông tin người dùng */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-ink">{profile.fullName}</h2>
          <p className="text-xs text-muted mt-1">{profile.joinedDate}</p>
        </div>

        {/* Danh sách menu tài khoản */}
        <nav aria-label="Menu tài khoản" className="space-y-4 text-sm font-medium">
          <div>
            <Link
              href="#"
              className="text-muted hover:text-ink transition-colors block"
            >
              Thông tin cá nhân
            </Link>
          </div>
          <div>
            <Link
              href="#"
              className="text-muted hover:text-ink transition-colors block"
            >
              Sổ địa chỉ
            </Link>
          </div>
          <div>
            {/* Mục đang hoạt động: Đơn hàng của tôi */}
            <Link
              href="/orders"
              className="text-blue-600 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>→</span>
              <span>Đơn hàng của tôi</span>
            </Link>
          </div>
          <div>
            <Link
              href="#"
              className="text-muted hover:text-ink transition-colors block"
            >
              Thú cưng của tôi
            </Link>
          </div>
          <div>
            <Link
              href="#"
              className="text-muted hover:text-ink transition-colors block"
            >
              Thông báo
            </Link>
          </div>
        </nav>
      </div>

      {/* Đường dẫn hỗ trợ ở dưới */}
      <div className="mt-12 pt-6">
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
