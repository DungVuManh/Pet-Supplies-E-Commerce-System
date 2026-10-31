"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";

export type CategoryItem = {
  _id?: string;
  name: string;
  slug: string;
  petType?: "dog" | "cat" | "both";
};

type ParentCategoryGroup = {
  id: string;
  title: string;
  viewAllTitle: string;
  defaultSlug: string;
  priority: string[];
  matches: (cat: CategoryItem) => boolean;
};

// ==================== CẤU HÌNH 4 CỘT DÀNH CHO CHÓ ====================
const DOG_PARENT_GROUPS: ParentCategoryGroup[] = [
  {
    id: "thuc-an-cho",
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
      // Loại trừ sữa tắm hoặc các mục của mèo
      if (s.includes("sua-tam") || n.includes("sữa tắm")) return false;
      return (
        s.includes("thuc-an") ||
        s.includes("hat-cho") ||
        s.includes("pate-cho") ||
        s.includes("banh-thuong") ||
        s.includes("banh-quy") ||
        s.includes("sua-cho-cho") ||
        n.includes("thức ăn") ||
        n.includes("hạt cho chó") ||
        n.includes("pate cho chó") ||
        n.includes("bánh thưởng") ||
        n.includes("sữa cho chó")
      );
    },
  },
  {
    id: "do-choi-cho",
    title: "ĐỒ CHƠI",
    viewAllTitle: "Xem tất cả Đồ chơi",
    defaultSlug: "do-choi-cho-cho-thu-nhoi-bong",
    priority: [
      "do-choi-cho-cho-thu-nhoi-bong",
      "do-choi-xuong-gam-cho-cho",
      "banh-quy-cho-cho",
      "do-choi-cho-cho",
    ],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("do-choi") ||
        s.includes("thu-nhoi-bong") ||
        s.includes("xuong-gam") ||
        n.includes("đồ chơi") ||
        n.includes("nhồi bông") ||
        n.includes("xương gặm")
      );
    },
  },
  {
    id: "phu-kien-cho",
    title: "PHỤ KIỆN & NHÀ",
    viewAllTitle: "Xem tất cả Phụ kiện & nhà",
    defaultSlug: "phu-kien-thu-cung",
    priority: [
      "phu-kien-thu-cung",
      "nem-va-chuong-cho-cho",
      "nem-chuong-cho",
      "dung-cu-an-uong-cho-meo",
      "ta-khay-ve-sinh-cho-cho",
      "ta-bim-cho",
    ],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("phu-kien") ||
        s.includes("nem-va-chuong") ||
        s.includes("nem-chuong") ||
        s.includes("dung-cu-an-uong") ||
        s.includes("ta-khay-ve-sinh") ||
        s.includes("ta-bim") ||
        n.includes("vòng cổ") ||
        n.includes("dây dắt") ||
        n.includes("nệm & chuồng") ||
        n.includes("dụng cụ ăn uống") ||
        n.includes("tã & khay vệ sinh") ||
        n.includes("tã & bỉm")
      );
    },
  },
  {
    id: "ve-sinh-cho",
    title: "VỆ SINH & SỨC KHỎE",
    viewAllTitle: "Xem tất cả Vệ sinh & sức khỏe",
    defaultSlug: "cham-soc-ve-sinh-cho-cho",
    priority: [
      "sua-tam-cho-cho",
      "tri-ve-ran-va-xo-giun-cho-cho",
      "ve-sinh-rang-mieng-cho-cho",
      "cham-soc-ve-sinh-cho-cho",
      "thuc-pham-chuc-nang-cho-cho",
      "ve-sinh-cho",
      "suc-khoe-cho",
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
        s.includes("ve-sinh-cho") ||
        s.includes("suc-khoe-cho") ||
        n.includes("sữa tắm") ||
        n.includes("ve rận") ||
        n.includes("răng miệng") ||
        n.includes("tai mắt") ||
        n.includes("vitamin") ||
        n.includes("sức khỏe")
      );
    },
  },
];

// ==================== CẤU HÌNH 4 CỘT DÀNH CHO MÈO ====================
const CAT_PARENT_GROUPS: ParentCategoryGroup[] = [
  {
    id: "thuc-an-meo",
    title: "THỨC ĂN",
    viewAllTitle: "Xem tất cả Thức ăn",
    defaultSlug: "thuc-an-cho-meo",
    priority: [
      "thuc-an-cho-meo",
      "hat-cho-meo",
      "pate-meo",
      "banh-thuong-cho-meo",
      "sup-thuong-cho-meo",
      "thuc-an-cho-meo-con-kitten",
      "thuc-an-thu-y-cho-meo",
    ],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      if (s.includes("sua-tam") || n.includes("sữa tắm")) return false;
      return (
        s.includes("thuc-an") ||
        s.includes("hat") ||
        s.includes("pate") ||
        s.includes("banh-thuong") ||
        s.includes("sup-thuong") ||
        n.includes("thức ăn") ||
        n.includes("hạt") ||
        n.includes("pate") ||
        n.includes("bánh thưởng") ||
        n.includes("súp thưởng")
      );
    },
  },
  {
    id: "do-choi-meo",
    title: "ĐỒ CHƠI & CÀO MÓNG",
    viewAllTitle: "Xem tất cả Đồ chơi",
    defaultSlug: "do-choi-cho-meo",
    priority: ["do-choi-cho-meo", "ban-cao-mong-cho-meo"],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("do-choi") ||
        s.includes("ban-cao-mong") ||
        n.includes("đồ chơi") ||
        n.includes("bàn cào móng") ||
        n.includes("cào móng")
      );
    },
  },
  {
    id: "phu-kien-meo",
    title: "PHỤ KIỆN & VẬN CHUYỂN",
    viewAllTitle: "Xem tất cả Phụ kiện & nhà",
    defaultSlug: "balo-meo",
    priority: ["balo-meo", "nem-chuong-meo", "dung-cu-an-uong-cho-meo"],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("balo") ||
        s.includes("tui-van-chuyen") ||
        s.includes("nem") ||
        s.includes("chuong") ||
        s.includes("dung-cu-an-uong") ||
        n.includes("balo") ||
        n.includes("vận chuyển") ||
        n.includes("nệm") ||
        n.includes("chuồng") ||
        n.includes("dụng cụ ăn uống")
      );
    },
  },
  {
    id: "ve-sinh-meo",
    title: "VỆ SINH & CÁT MÈO",
    viewAllTitle: "Xem tất cả Vệ sinh & sức khỏe",
    defaultSlug: "cat-meo",
    priority: [
      "cat-meo",
      "sua-tam-cho-meo",
      "cham-soc-ve-sinh-tai-mat-cho-meo",
      "cham-soc-ve-sinh-cho-meo",
      "thuc-pham-chuc-nang-cho-meo",
      "cham-soc-suc-khoe-cho-meo",
    ],
    matches: (c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();
      return (
        s.includes("cat-meo") ||
        s.includes("sua-tam") ||
        s.includes("ve-sinh") ||
        s.includes("suc-khoe") ||
        s.includes("thuc-pham-chuc-nang") ||
        n.includes("cát") ||
        n.includes("sữa tắm") ||
        n.includes("tai mắt") ||
        n.includes("vệ sinh") ||
        n.includes("vitamin") ||
        n.includes("sức khỏe")
      );
    },
  },
];

type MegaMenuProps = {
  isOpen: boolean;
  petType: "dog" | "cat";
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
    "thuc-an-cho": true,
    "do-choi-cho": true,
    "phu-kien-cho": true,
    "ve-sinh-cho": true,
    "thuc-an-meo": true,
    "do-choi-meo": true,
    "phu-kien-meo": true,
    "ve-sinh-meo": true,
  });

  const menuId = useId();
  const searchParams = useSearchParams();

  // Đọc params hiện tại trên URL để highlight mục active
  const currentCategory = searchParams?.get("category") || "";
  const currentPetType = searchParams?.get("petType") || "";

  // 1. Lấy danh mục từ API theo petType (chỉ lấy danh mục của loại thú cưng tương ứng)
  useEffect(() => {
    let isActive = true;

    async function fetchCategories() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/catalog/categories?petType=${petType}`);
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
  }, [petType]);

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

  // 3. Chọn nhóm cha tương ứng theo petType (Chó hoặc Mèo)
  const currentGroups = petType === "cat" ? CAT_PARENT_GROUPS : DOG_PARENT_GROUPS;

  // 4. Lọc danh mục thuộc riêng loài thú cưng đang chọn & deduplicate
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const s = c.slug.toLowerCase();
      const n = c.name.toLowerCase();

      if (petType === "dog") {
        // Loại bỏ danh mục của mèo
        if (c.petType === "cat") return false;
        if (s.includes("-meo") || n.includes("cho mèo") || n.includes("cho meo")) {
          // Ngoại trừ mục dùng chung như "Sữa cho chó mèo"
          if (!s.includes("sua-cho-cho-meo")) return false;
        }
        return true;
      } else {
        // petType === 'cat': Loại bỏ danh mục của chó
        if (c.petType === "dog") return false;
        if (s.includes("-cho") || n.includes("cho chó") || n.includes("cho cho")) {
          if (!s.includes("sua-cho-cho-meo")) return false;
        }
        return true;
      }
    });
  }, [categories, petType]);

  // 5. Phân bổ vào 4 cột & loại bỏ trùng lặp tên hiển thị
  const groupedCategories = useMemo(() => {
    // Tập hợp slug đã hiển thị ở các nhóm trước để không bị lặp lại ở nhóm sau
    const assignedSlugs = new Set<string>();

    return currentGroups.map((group) => {
      const matched = filteredCategories.filter((c) => {
        if (assignedSlugs.has(c.slug)) return false;
        return group.matches(c);
      });

      // Đánh dấu các slug đã gán
      matched.forEach((c) => assignedSlugs.add(c.slug));

      // Sắp xếp theo độ ưu tiên hiển thị
      const sorted = [...matched].sort((a, b) => {
        const idxA = group.priority.indexOf(a.slug);
        const idxB = group.priority.indexOf(b.slug);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name, "vi");
      });

      // Deduplicate: nếu có 2 mục tên giống nhau (ví dụ "Đồ chơi" và "Đồ Chơi"), chỉ giữ lại 1 mục
      const seenNames = new Set<string>();
      const deduplicated: CategoryItem[] = [];
      for (const item of sorted) {
        const normalizedName = item.name.trim().toLowerCase();
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          deduplicated.push(item);
        }
      }

      return {
        ...group,
        items: deduplicated,
      };
    });
  }, [currentGroups, filteredCategories]);

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
      aria-label={`Menu danh mục sản phẩm dành cho ${petType === "dog" ? "chó" : "mèo"}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute left-0 top-full z-50 w-full border-t border-gray-100 bg-white shadow-xl transition-all duration-150 animate-in fade-in slide-in-from-top-1"
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
                    {group.items.map((item) => {
                      const isItemActive =
                        currentCategory === item.slug && currentPetType === petType;

                      return (
                        <li key={item.slug}>
                          <Link
                            href={`/products?category=${item.slug}&petType=${petType}`}
                            onClick={onClose}
                            className={`group inline-flex items-center gap-2 text-[15px] no-underline transition-all duration-150 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF] ${
                              isItemActive
                                ? "font-bold text-[#0B4DFF]"
                                : "text-[#5B6178] hover:text-[#0B4DFF]"
                            }`}
                          >
                            {isItemActive && (
                              <span className="inline-block size-1.5 rounded-full bg-[#0B4DFF]" />
                            )}
                            <span className={isItemActive ? "font-bold" : "font-normal"}>
                              {item.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Link "Xem tất cả" */}
                  <div className="mt-auto pt-6">
                    <Link
                      href={`/products?category=${group.defaultSlug}&petType=${petType}`}
                      onClick={onClose}
                      className="group flex items-center justify-between gap-2 text-[15px] font-bold text-[#0B4DFF] no-underline transition-colors hover:text-[#083ecf] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF]"
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
                          {group.items.map((item) => {
                            const isItemActive =
                              currentCategory === item.slug && currentPetType === petType;

                            return (
                              <li key={item.slug}>
                                <Link
                                  href={`/products?category=${item.slug}&petType=${petType}`}
                                  onClick={onClose}
                                  className={`flex items-center gap-2 text-[14px] no-underline transition-colors hover:text-[#0B4DFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DFF] ${
                                    isItemActive
                                      ? "font-bold text-[#0B4DFF]"
                                      : "text-[#5B6178]"
                                  }`}
                                >
                                  {isItemActive && (
                                    <span className="size-1.5 rounded-full bg-[#0B4DFF]" />
                                  )}
                                  <span>{item.name}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="mt-4 pt-2">
                          <Link
                            href={`/products?category=${group.defaultSlug}&petType=${petType}`}
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
