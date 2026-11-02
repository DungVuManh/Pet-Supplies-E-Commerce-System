// =============================================================
// app/(customer)/wishlist/page.tsx
// Trang Danh sách yêu thích của khách hàng
// =============================================================

import type { Metadata } from "next";
import { WishlistView } from "@/features/wishlist";

export const metadata: Metadata = {
  title: "Danh sách yêu thích | Petjoy",
  description: "Xem và quản lý các sản phẩm thú cưng bạn đã lưu vào danh sách yêu thích.",
};

export default function WishlistPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16"
    >
      <WishlistView />
    </main>
  );
}

