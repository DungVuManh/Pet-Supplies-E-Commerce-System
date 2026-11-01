"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { authApi } from "@/features/auth/api";

interface AccountShellProps {
  activeTab: "profile" | "addresses" | "pets" | "orders";
  children: ReactNode;
}

export function AccountShell({ activeTab, children }: AccountShellProps) {
  const { user, acceptUser } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    try {
      await authApi.logout();
      acceptUser(null);
      router.replace("/");
      router.refresh();
    } catch {
      // Ignore
    }
  }

  // Format member since date
  const userCreatedAt = (user as unknown as { createdAt?: string })?.createdAt;
  const memberSince = userCreatedAt
    ? new Date(userCreatedAt).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    : "12/02/2026";

  const tabLabels = {
    profile: "Thông tin cá nhân",
    addresses: "Sổ địa chỉ",
    pets: "Thú cưng của tôi",
    orders: "Đơn hàng của tôi",
  };

  const navLinks = [
    {
      id: "profile",
      label: "Thông tin cá nhân",
      href: "/account/profile",
      icon: (
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
      ),
    },
    {
      id: "addresses",
      label: "Sổ địa chỉ",
      href: "/account/addresses",
      icon: (
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
          />
        </svg>
      ),
    },
    {
      id: "pets",
      label: "Thú cưng của tôi",
      href: "/account/pets",
      icon: (
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918"
          />
        </svg>
      ),
    },
    {
      id: "orders",
      label: "Đơn hàng của tôi",
      href: "/orders",
      icon: (
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex-1 bg-[#FAFBFE] py-6 md:py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-16">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-xs text-muted"
        >
          <Link href="/" className="hover:text-brand">
            Trang chủ
          </Link>
          <span className="text-muted/60">&gt;</span>
          <span className="text-muted">Tài khoản</span>
          <span className="text-muted/60">&gt;</span>
          <span className="font-semibold text-ink">
            {tabLabels[activeTab]}
          </span>
        </nav>

        {/* Layout: Sidebar + Main Area */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Left Sidebar */}
          <aside className="w-full shrink-0 lg:w-64">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
              {/* User Profile Header */}
              <div className="mb-6 border-b border-line/60 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line bg-canvas">
                    <Image
                      src={user?.avatarUrl || "/images/customer-avatar.jpg"}
                      alt={user?.fullName || "Avatar"}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-full w-full object-cover"
                      priority
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-ink">
                      {user?.fullName || "Nguyễn Minh Anh"}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      Thành viên từ {memberSince}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <nav aria-label="Menu tài khoản" className="space-y-1">
                {navLinks.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${isActive
                        ? "bg-brand-subtle text-brand"
                        : "text-muted hover:bg-canvas hover:text-ink"
                        }`}
                    >
                      <span className={isActive ? "text-brand" : "text-muted"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* Logout Button */}
                <div className="pt-2 mt-2 border-t border-line/60">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted hover:bg-danger-subtle hover:text-danger transition-colors"
                  >
                    <svg
                      className="h-5 w-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.75"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                      />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
