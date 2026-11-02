// =============================================================
// app/(customer)/reviews/page.tsx
// Trang Đánh giá của tôi (My Reviews)
// =============================================================

import type { Metadata } from "next";
import { MyReviewsView } from "@/features/reviews";

export const metadata: Metadata = {
  title: "Đánh giá của tôi | Petjoy",
  description: "Xem và quản lý các đánh giá sản phẩm của bạn tại Petjoy.",
};

export default function ReviewsPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <MyReviewsView />
    </main>
  );
}

