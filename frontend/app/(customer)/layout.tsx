import type { ReactNode } from "react";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <StorefrontHeader />
      {children}
      <StorefrontFooter />
    </div>
  );
}
