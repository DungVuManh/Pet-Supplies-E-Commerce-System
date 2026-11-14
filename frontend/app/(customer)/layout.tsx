import type { ReactNode } from "react";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { CartProvider } from "@/features/cart/cart-provider";
import { AuthProvider } from "@/features/auth/auth-provider";
import { WishlistProvider } from "@/features/wishlist";
import ZaloWidget from "@/features/catalog/components/homePage/components/zaloWidget";


export default function CustomerLayout({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <CartProvider>
                <WishlistProvider>
                    <div className="flex min-h-dvh flex-1 flex-col">
                        <StorefrontHeader />
                        {children}
                        <ZaloWidget phone="0838447686" />
                        <StorefrontFooter />
                    </div>
                </WishlistProvider>
            </CartProvider>
        </AuthProvider>
    );
}
