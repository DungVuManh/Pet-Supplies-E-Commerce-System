"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";

import type { Product } from "../products";

const tabs = [
  { id: "description", label: "Mô tả sản phẩm" },
  { id: "ingredients", label: "Thành phần & hướng dẫn" },
  { id: "reviews", label: "Đánh giá (128)" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ProductTabs({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<TabId>("description");

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
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "description" && (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_360px]">
            <div>
              <h3 className="text-lg font-semibold">
                Dinh dưỡng riêng cho chó giống nhỏ
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Protein dễ tiêu hóa, L-carnitine hỗ trợ chuyển hóa chất béo,
                Omega 3 & 6 chăm sóc da và lông. Hạt nhỏ phù hợp cấu trúc
                hàm. Bảo quản nơi khô ráo, đóng kín túi sau khi sử dụng.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold">Khách hàng nói gì?</h3>
              <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                <div className="flex shrink-0 gap-0.5 pt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className="fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p>
                  “Hạt nhỏ dễ ăn, bé rất thích. Giao nhanh và đóng gói cẩn
                  thận.”
                </p>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Trần Thu Hà · Đã mua hàng · 08/10/2026
              </p>
            </div>
          </div>
        )}

        {activeTab === "ingredients" && (
          <p className="text-sm text-slate-500">
            Nội dung thành phần &amp; hướng dẫn sử dụng sẽ hiển thị ở đây.
          </p>
        )}

        {activeTab === "reviews" && (
          <p className="text-sm text-slate-500">
            Danh sách đánh giá sẽ hiển thị ở đây.
          </p>
        )}
      </div>
    </section>
  );
}