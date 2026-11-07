"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { PromoCodeCard } from "@/components/storefront/promo-code-card";
import { useCartPage } from "./hooks/use-cart-page";
import { CartItemsTable } from "./components/cart-items-table";
import { CartSummary } from "./components/cart-summary";

export function CartView() {
    const {
        items,
        summary,
        isLoading,
        voucher,
        increaseQuantity,
        decreaseQuantity,
        removeItem,
    } = useCartPage();

    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

    const handleToggleSelect = (id: string) => {
        setSelectedItems((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    useEffect(() => {
        const selectedIds = Object.keys(selectedItems).filter((id) => selectedItems[id]);
        sessionStorage.setItem("petly_selected_cart_items", JSON.stringify(selectedIds));
    }, [selectedItems]);

    const selectedSubtotal = items.reduce((sum, item) => {
        return selectedItems[item.id] ? sum + item.product.price * item.quantity : sum;
    }, 0);

    const selectedQuantity = items.reduce((sum, item) => {
        return selectedItems[item.id] ? sum + item.quantity : sum;
    }, 0);

    const selectedDistinctCount = items.filter((item) => selectedItems[item.id]).length;

    const discount = selectedSubtotal > 0 ? summary.discount : 0;
    const computedSummary = {
        ...summary,
        distinctCount: selectedDistinctCount,
        totalQuantity: selectedQuantity,
        subtotal: selectedSubtotal,
        discount,
        total: Math.max(0, selectedSubtotal - discount),
    };

    return (
        <div className="w-full">
            {/* 1. Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="text-xs text-muted mb-3">
                <ol className="flex items-center gap-1.5">
                    <li>
                        <Link href="/" className="hover:text-brand transition-colors">
                            Trang chủ
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li className="font-medium text-ink">Giỏ hàng</li>
                </ol>
            </nav>

            {/* 2. Tiêu đề trang */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-ink tracking-tight">
                    Giỏ hàng của bạn
                </h1>
                <p className="mt-2 text-sm text-muted font-bold">
                    Có {summary.totalQuantity} món đồ
                    dành cho các bé.
                </p>
            </div>

            {/* 3. Bố cục 2 cột chính */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* CỘT TRÁI (8/12): Bảng sản phẩm + nút mua sắm + banner */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <CartItemsTable
                        items={items}
                        isLoading={isLoading}
                        onIncreaseQuantity={increaseQuantity}
                        onDecreaseQuantity={decreaseQuantity}
                        onRemoveItem={removeItem}
                        selectedItems={selectedItems}
                        onToggleSelect={handleToggleSelect}
                    />

                    {/* Tiếp tục mua sắm & Ghi chú */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <Link
                            href="/listProduct/allProducts"
                            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <span>←</span>
                            <span>Tiếp tục mua sắm</span>
                        </Link>

                    </div>
                </div>

                {/* CỘT PHẢI (4/12): Tóm tắt đơn hàng + Mã ưu đãi */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <CartSummary summary={computedSummary} />
                    {items.length > 0 && (
                        <PromoCodeCard
                            value={voucher.input}
                            onChange={voucher.setInput}
                            onApply={voucher.apply}
                            onRemove={voucher.remove}
                            message={voucher.message}
                            isError={voucher.isError}
                            pending={voucher.pending}
                            applied={voucher.applied}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default CartView;
