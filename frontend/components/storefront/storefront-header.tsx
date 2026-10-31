"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { CartPreview } from "@/features/cart/components/cart-preview";
import { StorefrontSearch, StorefrontSearchForm } from "./storefront-search";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { MegaMenu } from "./mega-menu";

type NavigationCategory = {
    name: string;
    href: string;
    petType?: "dog" | "cat";
};

const categories: NavigationCategory[] = [
    { name: "Sản phẩm", href: "/listProduct/allProducts" },
    { name: "Dành cho chó", href: "/products?petType=dog", petType: "dog" },
    { name: "Dành cho mèo", href: "/products?petType=cat", petType: "cat" },
];

const pageHome = [
    { name: "Trang chủ", href: "/" }
];

export function StorefrontHeader() {
    const [activeMenu, setActiveMenu] = useState<"dog" | "cat" | null>(null);
    const headerRef = useRef<HTMLElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Mở menu có độ trễ nhỏ (~100ms) khi hover để trải nghiệm mượt mà, tránh nhấp nháy
    const handleMouseEnter = (type: "dog" | "cat") => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setActiveMenu(type);
        }, 100);
    };

    // Khi con chuột di chuyển vào trong panel dropdown -> hủy hẹn giờ đóng
    const handleMenuMouseEnter = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    // Đóng menu có độ trễ (~100ms) khi chuột rời khỏi vùng kích hoạt
    const handleMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setActiveMenu(null);
        }, 100);
    };

    // Click vào nút để đóng/mở trực tiếp
    const handleToggleClick = (e: React.MouseEvent, type: "dog" | "cat") => {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        setActiveMenu((prev) => (prev === type ? null : type));
    };

    // Đóng dropdown khi click ra ngoài header
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
                setActiveMenu(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header ref={headerRef} className="relative shrink-0 shadow-sm">
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
                            {categories.map((category) => {
                                if (category.petType) {
                                    const isOpen = activeMenu === category.petType;
                                    const petType = category.petType;

                                    return (
                                        <li
                                            key={category.name}
                                            className="flex items-center gap-1.5"
                                            onMouseEnter={() => handleMouseEnter(petType)}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => handleToggleClick(e, petType)}
                                                aria-expanded={isOpen}
                                                aria-haspopup="true"
                                                aria-label={`Danh mục sản phẩm ${category.name.toLowerCase()}`}
                                                className={`flex items-center gap-1 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF] focus-visible:rounded ${
                                                    isOpen ? "text-[#0B4DFF]" : "hover:text-brand"
                                                }`}
                                            >
                                                <span>{category.name}</span>
                                                <ChevronDown
                                                    className={`size-3.5 transition-transform duration-150 ${
                                                        isOpen ? "rotate-180 text-[#0B4DFF]" : "text-muted"
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </li>
                                    );
                                }

                                return (
                                    <li key={category.name} className="flex items-center gap-5 lg:gap-6">
                                        <Link href={category.href} className="hover:text-brand font-bold">
                                            {category.name}
                                        </Link>
                                    </li>
                                );
                            })}
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

            {/* Panel dropdown mega menu danh mục cho Chó & Mèo */}
            <MegaMenu
                isOpen={Boolean(activeMenu)}
                petType={activeMenu || "dog"}
                onClose={() => setActiveMenu(null)}
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMouseLeave}
            />
        </header>
    );
}
