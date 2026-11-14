// =============================================================
// features/policy/components/policy-view.tsx
// Component tổng hợp màn hình Chính sách (Policy)
// =============================================================

"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import React from "react";
import type { PolicyItem } from "../types";
import { PolicyContent } from "./policy-content";
import { PolicySidebar } from "./policy-sidebar";

interface PolicyViewProps {
  menuPolicies: PolicyItem[];
  currentPolicy: PolicyItem | null;
  activeSlug: string;
}

export function PolicyView({
  menuPolicies,
  currentPolicy,
  activeSlug,
}: PolicyViewProps) {
  return (
    <div className="w-full">
      {/* 1. Breadcrumb điều hướng */}
      <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-brand transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="size-3.5 text-slate-400" />
        <Link href="/policy/chinh-sach-van-chuyen" className="hover:text-brand transition-colors">
          Chính sách
        </Link>
        {currentPolicy && (
          <>
            <ChevronRight className="size-3.5 text-slate-400" />
            <span className="font-semibold text-ink truncate max-w-xs sm:max-w-md">
              {currentPolicy.label}
            </span>
          </>
        )}
      </nav>

      {/* 2. Bố cục 2 cột: Sidebar bên trái & Nội dung bên phải */}
      <div className="flex flex-col lg:flex-row items-start gap-8 xl:gap-12">
        {/* Sidebar danh mục (chỉ hiện các policy có showInMenu === true) */}
        <PolicySidebar
          menuPolicies={menuPolicies}
          activeSlug={activeSlug}
        />

        {/* Nội dung chi tiết policy */}
        <PolicyContent policy={currentPolicy} />
      </div>
    </div>
  );
}

