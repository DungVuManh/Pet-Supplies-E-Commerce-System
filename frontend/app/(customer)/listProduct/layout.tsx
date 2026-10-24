import type { ReactNode } from "react";
import { CartProvider } from "@/features/cart/cart-provider";
import { AuthProvider } from "@/features/auth/auth-provider";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider><CartProvider>
      <div className="flex min-h-dvh flex-1 flex-col">
        {children}
      </div>
    </CartProvider></AuthProvider>
  );
}
