// =============================================================
// features/policy/components/policy-sidebar.tsx
// Sidebar danh mục chính sách: Bám chuẩn bố cục ảnh mẫu, dạng pill bo tròn,
// chỉ dùng màu theme primary (brand), hỗ trợ tab cuộn ngang trên mobile
// =============================================================

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import type { PolicyItem } from "../types";

interface PolicySidebarProps {
  menuPolicies: PolicyItem[];
  activeSlug: string;
}

export function PolicySidebar({ menuPolicies, activeSlug }: PolicySidebarProps) {
  const router = useRouter();

  return (
    <aside aria-label="Danh mục chính sách" className="w-full lg:w-72 shrink-0">
      {/* 1. Phiên bản Mobile: Thanh tab cuộn ngang & Dropdown lựa chọn */}
      <div className="block lg:hidden mb-6">
        <div className="flex items-center gap-2 mb-2 sm:hidden">
          <span className="text-xs font-semibold text-slate-500">Chọn mục:</span>
          <select
            value={activeSlug}
            onChange={(e) => router.push(`/policy/${e.target.value}`)}
            className="flex-1 rounded-xl border border-line bg-surface py-2 px-3 text-xs font-semibold text-ink focus:border-brand focus:outline-none"
          >
            {menuPolicies.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tab cuộn ngang mượt mà cho tablet / mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
          {menuPolicies.map((item) => {
            const isActive = activeSlug === item.slug;
            return (
              <Link
                key={item.slug}
                href={`/policy/${item.slug}`}
                className={`shrink-0 rounded-full px-4 py-2 text-xs transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-brand-subtle text-brand font-bold border border-brand/20 shadow-xs"
                    : "bg-surface border border-line text-slate-600 hover:text-brand hover:bg-brand-subtle/40 font-medium"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. Phiên bản Desktop: Danh sách dọc dạng pill bo tròn (bám chuẩn bố cục ảnh mẫu) */}
      <nav className="hidden lg:flex flex-col gap-2.5 p-1 select-none">
        {menuPolicies.map((item) => {
          const isActive = activeSlug === item.slug;
          return (
            <Link
              key={item.slug}
              href={`/policy/${item.slug}`}
              className={`flex items-center px-5 py-3.5 rounded-2xl text-[14.5px] transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-brand-subtle text-brand font-bold shadow-xs"
                  : "text-slate-600 font-medium hover:bg-brand-subtle/50 hover:text-brand"
              }`}
            >
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
