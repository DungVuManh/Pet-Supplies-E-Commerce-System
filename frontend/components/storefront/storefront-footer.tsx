"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { getFooterPolicyLinks } from "@/features/policy";

export function StorefrontFooter() {
  const [footerLinks, setFooterLinks] = useState<Array<{ slug: string; label: string }>>(() => {
    return getFooterPolicyLinks() || [];
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDynamicPolicies() {
      try {
        const res = await fetch("/api/v1/policies", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!isMounted || !json?.success || !Array.isArray(json?.data)) return;

        const FOOTER_POLICY_SLUGS = [
          "chinh-sach-doi-tra-hang",
          "huong-dan-thanh-toan",
          "chinh-sach-gia",
          "huong-dan-mua-hang",
          "chinh-sach-van-chuyen",
          "chinh-sach-bao-mat",
          "faq",
          "chinh-sach-khieu-nai",
          "dieu-khoan-su-dung",
          "dieu-kien-han-che-cung-cap",
          "ho-tro-truc-tuyen",
        ];
        const orderMap = new Map<string, number>();
        FOOTER_POLICY_SLUGS.forEach((slug, idx) => orderMap.set(slug, idx));

        const backendPolicies = json.data as Array<{ slug: string; title: string }>;
        const sorted = [...backendPolicies].sort((a, b) => {
          const orderA = orderMap.has(a.slug) ? orderMap.get(a.slug)! : 1000;
          const orderB = orderMap.has(b.slug) ? orderMap.get(b.slug)! : 1000;
          return orderA - orderB;
        });

        // Deduplicate policies by slug to avoid duplicate links and key collision
        const seenSlugs = new Set<string>();
        const uniqueLinks: Array<{ slug: string; label: string }> = [];
        for (const p of sorted) {
          if (!seenSlugs.has(p.slug)) {
            seenSlugs.add(p.slug);
            uniqueLinks.push({
              slug: p.slug,
              label: p.title,
            });
          }
        }

        if (uniqueLinks.length > 0) {
          setFooterLinks(uniqueLinks);
        }
      } catch {
        // Fallback to initial static links
      }
    }

    loadDynamicPolicies();

    return () => {
      isMounted = false;
    };
  }, []);

  const safeLinks = Array.isArray(footerLinks) ? footerLinks : [];

  return (
    <footer className="shrink-0 border-t border-line bg-surface text-xs text-muted">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 text-center md:flex-row md:items-center md:justify-between md:py-4 md:text-left xl:px-16">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3 shrink-0">
          <Logo href="/" size="sm" />
          <p>© 2026 Petjoy. Chăm sóc trọn vẹn, yêu thương mỗi ngày.</p>
        </div>

        {/* Block Hỗ Trợ Khách Hàng: Link liên hệ trực tiếp + 11 policy links + dynamic policies */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3.5 gap-y-2">
          <span className="font-bold text-ink mr-0.5">Hỗ Trợ Khách Hàng:</span>
          <Link
            href="/support"
            className="font-semibold text-brand hover:underline transition-colors whitespace-nowrap"
          >
            Liên hệ Petjoy
          </Link>
          <span aria-hidden="true" className="text-line">·</span>
          {safeLinks.map((item, index) => (
            <React.Fragment key={`${item.slug}-${index}`}>
              <Link
                href={`/policy/${item.slug}`}
                className="hover:text-brand transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
              {index < safeLinks.length - 1 && (
                <span aria-hidden="true" className="text-line">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
}
