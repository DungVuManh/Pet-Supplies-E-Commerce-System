// =============================================================
// features/policy/components/policy-text.tsx
// Component phân tích & render text hỗ trợ **in đậm** và [nhãn](url)
// Link "policy:<slug>" chuyển mục trong màn hình, link ngoài mở tab mới
// =============================================================

"use client";

import Link from "next/link";
import React from "react";

interface PolicyTextProps {
  content?: string;
}

export function PolicyText({ content }: PolicyTextProps) {
  if (!content) return null;

  // Tách văn bản theo cú pháp [nhãn](url) và **in đậm**
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  const parts = content.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // 1. Khối **in đậm**
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          const boldText = part.slice(2, -2);
          return (
            <strong key={index} className="font-bold text-ink">
              <PolicyText content={boldText} />
            </strong>
          );
        }

        // 2. Khối liên kết [nhãn](url)
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          const label = linkMatch[1];
          const rawUrl = linkMatch[2];

          // Liên kết nội bộ chính sách: policy:<slug>
          if (rawUrl.startsWith("policy:")) {
            const targetSlug = rawUrl.replace(/^policy:/, "");
            return (
              <Link
                key={index}
                href={`/policy/${targetSlug}`}
                className="font-semibold text-brand hover:underline transition-colors"
              >
                {label}
              </Link>
            );
          }

          // Liên kết web ngoài: https:// hoặc http://
          if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
            return (
              <a
                key={index}
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:underline transition-colors"
              >
                {label}
              </a>
            );
          }

          // Liên kết tương đối khác
          return (
            <Link
              key={index}
              href={rawUrl}
              className="font-semibold text-brand hover:underline transition-colors"
            >
              {label}
            </Link>
          );
        }

        // 3. Văn bản bình thường
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

