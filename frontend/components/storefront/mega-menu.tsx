"use client";

import Link from "next/link";
import React, { useEffect, useId, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

export type CategoryItem = {
  _id?: string;
  name: string;
  slug: string;
};

type ParentCategoryGroup = {
  id: string;
  title: string;
  viewAllTitle: string;
  defaultSlug: string;
  priority: string[];
  matches: (cat: CategoryItem) => boolean;
};

const PARENT_GROUPS: ParentCategoryGroup[] = [
  {
    id: "thuc-an",
    title: "THỨC ĂN",
    viewAllTitle: "Xem tất cả Thức ăn",
    defaultSlug: "thuc-an-cho-cho",
    priority: [
      "thuc-an-cho-cho",
      "hat-cho-cho",
      "pate-cho",
      "banh-thuong-cho-cho",
      "thuc-an-cao-cap-cho-cho",
      "thuc-an-hat-cho-cho-con",
      "thuc-an-cho-cho-thu-y",
      "sua-cho-cho-meo",
    ],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("thuc-an") ||
        s.includes("hat-cho") ||
        s.includes("pate") ||
        s.includes("banh-thuong") ||
        s.includes("sua-cho") ||
        n.includes("thức ăn") ||
        n.includes("hạt cho chó") ||
        n.includes("pate") ||
        n.includes("bánh thưởng") ||
        n.includes("sữa")
      );
    },
  },
  {
    id: "do-choi",
    title: "ĐỒ CHƠI",
    viewAllTitle: "Xem tất cả Đồ chơi",
    defaultSlug: "do-choi-cho-cho-thu-nhoi-bong",
    priority: [
      "do-choi-cho-cho-thu-nhoi-bong",
      "do-choi-xuong-gam-cho-cho",
      "banh-quy-cho-cho",
    ],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("do-choi") ||
        s.includes("thu-nhoi-bong") ||
        s.includes("xuong-gam") ||
        s.includes("banh-quy") ||
        n.includes("đồ chơi") ||
        n.includes("nhồi bông") ||
        n.includes("xương gặm") ||
        n.includes("bánh quy")
      );
    },
  },
  {
    id: "phu-kien",
    title: "PHỤ KIỆN & NHÀ",
    viewAllTitle: "Xem tất cả Phụ kiện & nhà",
    defaultSlug: "phu-kien-thu-cung",
    priority: [
      "phu-kien-thu-cung",
      "nem-va-chuong-cho-cho",
      "dung-cu-an-uong-cho-meo",
      "ta-khay-ve-sinh-cho-cho",
    ],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("phu-kien") ||
        s.includes("nem-va-chuong") ||
        s.includes("dung-cu-an-uong") ||
        s.includes("ta-khay-ve-sinh") ||
        n.includes("vòng cổ") ||
        n.includes("dây dắt") ||
        n.includes("nệm & chuồng") ||
        n.includes("dụng cụ ăn uống") ||
        n.includes("tã & khay vệ sinh")
      );
    },
  },
  {
    id: "ve-sinh",
    title: "VỆ SINH & SỨC KHỎE",
    viewAllTitle: "Xem tất cả Vệ sinh & sức khỏe",
    defaultSlug: "cham-soc-ve-sinh-cho-cho",
    priority: [
      "sua-tam-cho-cho",
      "tri-ve-ran-va-xo-giun-cho-cho",
      "ve-sinh-rang-mieng-cho-cho",
      "cham-soc-ve-sinh-cho-cho",
      "thuc-pham-chuc-nang-cho-cho",
    ],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("sua-tam") ||
        s.includes("tri-ve-ran") ||
        s.includes("ve-sinh-rang-mieng") ||
        s.includes("cham-soc-ve-sinh") ||
        s.includes("thuc-pham-chuc-nang") ||
        n.includes("sữa tắm") ||
        n.includes("ve rận") ||
        n.includes("răng miệng") ||
        n.includes("tai mắt") ||
        n.includes("vitamin")
      );
    },
  },
];

type MegaMenuProps = {
  isOpen: boolean;
  petType?: "dog" | "cat";
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function MegaMenu({
  isOpen,
  petType = "dog",
  onClose,
  onMouseEnter,
  onMouseLeave,
}: MegaMenuProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    "thuc-an": true,
    "do-choi": true,
    "phu-kien": true,
    "ve-sinh": true,
  });

  const menuId = useId();

  // 1. Lấy danh mục đang active từ API thực tế
  useEffect(() => {
    let isActive = true;

    async function fetchCategories() {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/catalog/categories");
        const json = await res.json();
        if (isActive && json?.data?.categories) {
          setCategories(json.data.categories);
        }
      } catch (err) {
        console.error("[MegaMenu] Không thể tải danh mục:", err);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    fetchCategories();

    return () => {
      isActive = false;
    };
  }, []);

  // 2. Lắng nghe phím ESC để đóng menu
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Phân loại danh mục theo 4 nhóm cha
  const groupedCategories = PARENT_GROUPS.map((group) => {
    // Lọc danh mục thuộc nhóm này từ dữ liệu thật
    const matched = categories.filter((c) => group.matches(c));

    // Sắp xếp theo thứ tự ưu tiên hiển thị giống mẫu
    const sorted = [...matched].sort((a, b) => {
      const idxA = group.priority.indexOf(a.slug);
      const idxB = group.priority.indexOf(b.slug);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name, "vi");
    });

    return {
      ...group,
      items: sorted,
    };
  });

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      id={menuId}
      role="region"
      aria-label="Menu danh mục sản phẩm cho chó"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute left-0 top-full z-50 w-full border-t border-gray-100 bg-white shadow-md transition-all duration-150 animate-in fade-in slide-in-from-top-1"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-8 sm:px-8 lg:px-12">
        {loading && categories.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#5B6178]">
            Đang tải danh mục sản phẩm...
          </div>
        ) : (
          <>
            {/* 1. Bố cục Desktop: 4 Cột bằng nhau (CSS grid) */}
            <div className="hidden grid-cols-4 gap-10 lg:grid">
              {groupedCategories.map((group) => (
                <div key={group.id} className="flex flex-col">
                  {/* Tiêu đề cột: Chữ IN HOA, in đậm, màu #1E2140 */}
                  <h3 className="mb-5 text-[15px] font-bold uppercase tracking-wide text-[#1E2140]">
                    {group.title}
                  </h3>

                  {/* Danh sách danh mục con */}
                  <ul className="m-0 flex flex-col gap-3.5 p-0 list-none">
                    {group.items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={`/products?category=${item.slug}`}
                          onClick={onClose}
                          className="inline-block text-[15px] text-[#5B6178] no-underline transition-colors duration-150 hover:text-[#0B4DFF] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF]"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {/* Link "Xem tất cả" */}
                  <div className="mt-auto pt-6">
                    <Link
                      href={`/products?category=${group.defaultSlug}`}
                      onClick={onClose}
                      className="group flex items-center justify-between gap-2 text-[15px] font-bold text-[#0B4DFF] no-underline transition-colors hover:text-[#0B4DFF] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF]"
                    >
                      <span className="min-w-0 flex-1 leading-snug">
                        {group.viewAllTitle}
                      </span>
                      <ArrowRight
                        className="size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Bố cục Responsive (< 1024px): Accordion theo từng danh mục cha */}
            <div className="flex flex-col divide-y divide-gray-100 lg:hidden">
              {groupedCategories.map((group) => {
                const isExpanded = Boolean(openAccordions[group.id]);
                return (
                  <div key={group.id} className="py-3">
                    <button
                      type="button"
                      onClick={() => toggleAccordion(group.id)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between text-left text-[15px] font-bold uppercase tracking-wide text-[#1E2140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF]"
                    >
                      <span>{group.title}</span>
                      <ChevronDown
                        className={`size-4 text-[#5B6178] transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {isExpanded && (
                      <div className="mt-3.5 pl-2 animate-in fade-in slide-in-from-top-1">
                        <ul className="flex flex-col gap-3 list-none p-0 m-0">
                          {group.items.map((item) => (
                            <li key={item.slug}>
                              <Link
                                href={`/products?category=${item.slug}`}
                                onClick={onClose}
                                className="block text-[14px] text-[#5B6178] no-underline transition-colors hover:text-[#0B4DFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF]"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-4 pt-2">
                          <Link
                            href={`/products?category=${group.defaultSlug}`}
                            onClick={onClose}
                            className="group flex items-center justify-between text-[14px] font-bold text-[#0B4DFF] no-underline"
                          >
                            <span>{group.viewAllTitle}</span>
                            <ArrowRight
                              className="size-4 transition-transform group-hover:translate-x-1"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

