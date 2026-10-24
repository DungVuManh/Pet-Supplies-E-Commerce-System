import type { Metadata } from "next";
import { CartView } from "@/features/cart/components/cart-view";

export const metadata: Metadata = {
  title: "Giỏ hàng của bạn | Petjoy",
  description: "Xem và quản lý các sản phẩm trong giỏ hàng của bạn tại Petjoy.",
};

export default function CartPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-8 outline-none xl:px-16"
    >
      <CartView />
    </main>
  );
}
