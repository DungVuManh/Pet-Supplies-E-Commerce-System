import Link from "next/link";
import React from "react";
import { Logo } from "@/components/ui/logo";
import { getFooterPolicyLinks } from "@/features/policy";

export async function StorefrontFooter() {
  const footerLinks = await getFooterPolicyLinks();

  return (
    <footer className="shrink-0 border-t border-line bg-surface text-xs text-muted">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 text-center md:flex-row md:items-center md:justify-between md:py-4 md:text-left xl:px-16">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3 shrink-0">
          <Logo href="/" size="sm" />
          <p>© 2026 Petjoy. Chăm sóc trọn vẹn, yêu thương mỗi ngày.</p>
        </div>

        {/* Block Hỗ Trợ Khách Hàng: Link liên hệ trực tiếp + 11 policy links */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3.5 gap-y-2">
          <span className="font-bold text-ink mr-0.5">Hỗ Trợ Khách Hàng:</span>
          <Link
            href="/support"
            className="font-semibold text-brand hover:underline transition-colors whitespace-nowrap"
          >
            Liên hệ Petjoy
          </Link>
          <span aria-hidden="true" className="text-line">·</span>
          {footerLinks.map((item, index) => (
            <React.Fragment key={item.slug}>
              <Link
                href={`/policy/${item.slug}`}
                className="hover:text-brand transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
              {index < footerLinks.length - 1 && (
                <span aria-hidden="true" className="text-line">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
}
