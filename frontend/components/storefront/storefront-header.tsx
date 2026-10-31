"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentPetType = searchParams?.get("petType");

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
        }, 120);
    };

    // Click vào nút để đóng/mở trực tiếp
    const handleToggleClick = (e: React.MouseEvent, type: "dog" | "cat") => {
        e.preventDefault();
        e.stopPropagation();
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
            <div className="h-12 border-b border-line bg-white">
                <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-6 px-6 xl:px-16">
                    <nav
                        aria-label="Danh mục sản phẩm"
                        className="flex h-full min-w-0 items-center overflow-x-auto"
                    >
                        <ul className="flex h-full items-center gap-6 whitespace-nowrap text-sm lg:gap-8">
                            {pageHome.map((item) => {
                                const isHomeActive = pathname === "/";
                                return (
                                    <li key={item.name} className="flex h-full items-center">
                                        <Link
                                            href={item.href}
                                            className={`relative flex h-full items-center font-bold transition-colors ${
                                                isHomeActive
                                                    ? "text-[#0B4DFF]"
                                                    : "text-gray-700 hover:text-brand"
                                            }`}
                                        >
                                            {item.name}
                                            {isHomeActive && (
                                                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#0B4DFF]" />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}

                            {categories.map((category) => {
                                if (category.petType) {
                                    const petType = category.petType;
                                    const isOpen = activeMenu === petType;
                                    // Active khi: đang ở trang lọc của petType đó HOẶC đang mở dropdown
                                    const isPageActive =
                                        (pathname.startsWith("/products") || pathname.startsWith("/listProduct")) &&
                                        currentPetType === petType;
                                    const isActive = isPageActive || isOpen;

                                    return (
                                        <li
                                            key={category.name}
                                            className="relative flex h-full items-center"
                                            onMouseEnter={() => handleMouseEnter(petType)}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <div
                                                className={`flex h-full items-center gap-1 font-bold transition-colors ${
                                                    isActive
                                                        ? "text-[#0B4DFF]"
                                                        : "text-gray-700 hover:text-brand"
                                                }`}
                                            >
                                                {/* Click trực tiếp vào tên danh mục sẽ chuyển trang đến bộ lọc tương ứng */}
                                                <Link
                                                    href={category.href}
                                                    onClick={() => setActiveMenu(null)}
                                                    className="flex h-full items-center"
                                                >
                                                    <span>{category.name}</span>
                                                </Link>

                                                {/* Nút mũi tên toggle mở dropdown menu */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleToggleClick(e, petType)}
                                                    aria-expanded={isOpen}
                                                    aria-haspopup="true"
                                                    aria-label={`Danh mục sản phẩm ${category.name.toLowerCase()}`}
                                                    className="flex h-full items-center p-1 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF]"
                                                >
                                                    <ChevronDown
                                                        className={`size-3.5 transition-transform duration-150 ${
                                                            isOpen
                                                                ? "rotate-180 text-[#0B4DFF]"
                                                                : isActive
                                                                ? "text-[#0B4DFF]"
                                                                : "text-muted"
                                                        }`}
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            </div>

                                            {/* Gạch chân chỉ báo active */}
                                            {isActive && (
                                                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#0B4DFF]" />
                                            )}
                                        </li>
                                    );
                                }

                                // Mục "Sản phẩm" (tất cả sản phẩm)
                                const isAllProductActive =
                                    (pathname === "/listProduct/allProducts" ||
                                        (pathname.startsWith("/products") && !currentPetType));

                                return (
                                    <li key={category.name} className="flex h-full items-center">
                                        <Link
                                            href={category.href}
                                            className={`relative flex h-full items-center font-bold transition-colors ${
                                                isAllProductActive
                                                    ? "text-[#0B4DFF]"
                                                    : "text-gray-700 hover:text-brand"
                                            }`}
                                        >
                                            {category.name}
                                            {isAllProductActive && (
                                                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#0B4DFF]" />
                                            )}
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

            {/* Panel dropdown mega menu danh mục cho Chó & Mèo riêng biệt */}
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
