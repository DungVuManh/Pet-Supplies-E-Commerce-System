// =============================================================
// features/reviews/components/review-empty.tsx
// Trạng thái rỗng khi chưa có sản phẩm cần đánh giá hoặc chưa viết review nào
// =============================================================

"use client";

import Link from "next/link";
import { MessageSquare, ShoppingBag, Sparkles } from "lucide-react";
import React from "react";
import type { ReviewTab } from "../hooks/use-my-reviews";

interface ReviewEmptyProps {
  tab: ReviewTab;
}

export function ReviewEmpty({ tab }: ReviewEmptyProps) {
  if (tab === "unreviewed") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-12 text-center shadow-xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-brand mb-4">
          <Sparkles className="size-8" />
        </div>
        <h3 className="text-base font-bold text-ink">
          Không có sản phẩm nào chờ đánh giá
        </h3>
        <p className="mt-1.5 max-w-sm text-xs text-muted leading-relaxed">
          Tất cả sản phẩm đã mua trong vòng 30 ngày qua đã được bạn đánh giá, hoặc bạn chưa có đơn hàng nào vừa hoàn tất.
        </p>
        <Link
          href="/listProduct/allProducts"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition-colors cursor-pointer"
        >
          <ShoppingBag className="size-4" />
          <span>Mua sắm ngay</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-12 text-center shadow-xs">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-brand mb-4">
        <MessageSquare className="size-8" />
      </div>
      <h3 className="text-base font-bold text-ink">
        Chưa có đánh giá nào
      </h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted leading-relaxed">
        Bạn chưa viết nhận xét nào cho các sản phẩm đã mua. Hãy chuyển sang tab &quot;Chưa đánh giá&quot; để chia sẻ trải nghiệm nhé!
      </p>
    </div>
  );
}

