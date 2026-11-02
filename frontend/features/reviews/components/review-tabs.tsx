// =============================================================
// features/reviews/components/review-tabs.tsx
// Thanh chuyển đổi giữa 2 tab: "Chưa đánh giá" và "Đã đánh giá"
// =============================================================

"use client";

import React from "react";
import type { ReviewTab } from "../hooks/use-my-reviews";

interface ReviewTabsProps {
  activeTab: ReviewTab;
  unreviewedCount: number;
  reviewedCount: number;
  onTabChange: (tab: ReviewTab) => void;
}

export function ReviewTabs({
  activeTab,
  unreviewedCount,
  reviewedCount,
  onTabChange,
}: ReviewTabsProps) {
  return (
    <div className="flex border-b border-line gap-2 sm:gap-6 overflow-x-auto [scrollbar-width:none]">
      {/* Tab 1: Chưa đánh giá */}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "unreviewed"}
        onClick={() => onTabChange("unreviewed")}
        className={`relative flex items-center gap-2 pb-3 pt-1 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
          activeTab === "unreviewed"
            ? "text-brand border-b-2 border-brand"
            : "text-muted hover:text-ink border-b-2 border-transparent"
        }`}
      >
        <span>Chưa đánh giá</span>
        <span
          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
            activeTab === "unreviewed"
              ? "bg-brand text-white"
              : "bg-surface border border-line text-muted"
          }`}
        >
          {unreviewedCount}
        </span>
      </button>

      {/* Tab 2: Đã đánh giá */}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "reviewed"}
        onClick={() => onTabChange("reviewed")}
        className={`relative flex items-center gap-2 pb-3 pt-1 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
          activeTab === "reviewed"
            ? "text-brand border-b-2 border-brand"
            : "text-muted hover:text-ink border-b-2 border-transparent"
        }`}
      >
        <span>Đã đánh giá</span>
        <span
          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
            activeTab === "reviewed"
              ? "bg-brand text-white"
              : "bg-surface border border-line text-muted"
          }`}
        >
          {reviewedCount}
        </span>
      </button>
    </div>
  );
}

