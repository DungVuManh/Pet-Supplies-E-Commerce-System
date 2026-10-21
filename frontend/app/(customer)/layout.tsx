import type { ReactNode } from "react";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { CartProvider } from "@/features/cart/cart-provider";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-1 flex-col">
        <StorefrontHeader />
        {children}
        <StorefrontFooter />
      </div>
    </CartProvider>
  );
}
