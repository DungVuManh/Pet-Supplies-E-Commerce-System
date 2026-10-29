import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { CartPreview } from "@/features/cart/components/cart-preview";
import { StorefrontSearch, StorefrontSearchForm } from "./storefront-search";
import { AccountMenu } from "@/features/auth/components/account-menu";

const categories = [
    { name: "Sản phẩm", href: "/listProduct/allProducts" },
    { name: "Dành cho chó", href: "/?category=dog#featured-products" },
    { name: "Dành cho mèo", href: "/?category=cat#featured-products" },
];
const pageHome = [
    { name: "Trang chủ", href: "/" }
]

export function StorefrontHeader() {
    return (
        <header className="shrink-0 shadow-sm">
            <a
                href="#main-content"
                className="sr-only z-10 rounded-lg bg-surface p-3 focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
            >
                Chuyển đến nội dung chính
            </a>
            <div className=" md:h-[88px]">
                <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-2 gap-y-4 px-6 py-5 md:h-full md:flex-nowrap md:gap-8 md:py-0 xl:px-16">
                    <Logo href="/" size="md" priority />
                    <Suspense fallback={<StorefrontSearchForm />}>
                        <StorefrontSearch />
                    </Suspense>
                    <div className="ml-auto flex items-center gap-4 whitespace-nowrap md:ml-0 md:gap-8">
                        <a
                            href="tel:1900636789"
                            className="hidden text-brand hover:underline sm:inline"
                        >
                            Trợ giúp
                        </a>
                        <CartPreview />
                        <AccountMenu />
                    </div>
                </div>
            </div>
            <div className="h-12 border-b border-line ">
                <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-6 px-6 xl:px-16">
                    <nav
                        aria-label="Danh mục sản phẩm"
                        className="flex h-full min-w-0 items-center overflow-x-auto"
                    >
                        <ul className="flex items-center gap-5 whitespace-nowrap text-sm lg:gap-6">
                            {pageHome.map((item) => (
                                <li key={item.name} className="flex items-center gap-5 lg:gap-6">
                                    <Link href={item.href} className="hover:text-brand font-bold">
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                            {categories.map((category) => (
                                <li key={category.name} className="flex items-center gap-5 lg:gap-6">
                                    <Link href={category.href} className="hover:text-brand font-bold">
                                        {category.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <p className="hidden shrink-0 text-xs text-muted xl:block">
                        Giao hàng toàn quốc · Hỗ trợ{" "}
                        <a href="tel:1900636789" className="hover:text-brand">
                            1900 636 789
                        </a>
                    </p>
                </div>
            </div>
        </header>
    );
}
