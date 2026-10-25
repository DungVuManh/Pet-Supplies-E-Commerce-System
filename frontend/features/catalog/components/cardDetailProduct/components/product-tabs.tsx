"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-tabs.tsx
// Component các Tab chi tiết sản phẩm: Mô tả, Thành phần & Đánh giá
// =============================================================

import React, { useState } from "react";
import type { Product } from "../types";

type TabId = "description" | "ingredients" | "reviews";

export function ProductTabs({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<TabId>("description");

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Mô tả sản phẩm" },
    { id: "ingredients", label: "Thành phần & hướng dẫn" },
    {
      id: "reviews",
      label: product.ratingCount ? `Đánh giá (${product.ratingCount})` : "Đánh giá",
    },
  ];

  return (
    <section className="mt-10">
      <div className="flex gap-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* Tab 1: Mô tả sản phẩm */}
        {activeTab === "description" && (
          <div className="prose max-w-none text-sm leading-relaxed text-slate-600">
            <p>{product.description || "Chưa có thông tin mô tả chi tiết cho sản phẩm này."}</p>
          </div>
        )}

        {/* Tab 2: Thành phần & Hướng dẫn */}
        {activeTab === "ingredients" && (
          <p className="text-sm text-slate-500">
            Thông tin thành phần dinh dưỡng và hướng dẫn sử dụng đang được cập nhật.
          </p>
        )}

        {/* Tab 3: Đánh giá */}
        {activeTab === "reviews" && (
          <p className="text-sm text-slate-500">
            {product.ratingCount
              ? `Sản phẩm có ${product.ratingCount} lượt đánh giá với điểm trung bình ${product.ratingAvg ?? 5}/5 sao.`
              : "Sản phẩm hiện chưa có đánh giá nào từ khách hàng."}
          </p>
        )}
      </div>
    </section>
  );
}
