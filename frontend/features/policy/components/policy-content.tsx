// =============================================================
// features/policy/components/policy-content.tsx
// Hiển thị nội dung chi tiết của một Chính sách (Policy)
// Hỗ trợ đầy đủ các khối: title, updatedAt, intro, sections,
// các dạng blocks (p, h3, ul, ol, note, kv) và trạng thái rỗng
// =============================================================

"use client";

import { Calendar, Info } from "lucide-react";
import React from "react";
import type { PolicyItem } from "../types";
import { PolicyText } from "./policy-text";

interface PolicyContentProps {
  policy: PolicyItem | null;
}

export function PolicyContent({ policy }: PolicyContentProps) {
  // 1. Trường hợp không tìm thấy policy hoặc policy rỗng hoàn toàn
  if (!policy || (!policy.intro && (!policy.sections || policy.sections.length === 0))) {
    return (
      <article className="flex-1 rounded-2xl border border-line bg-surface p-8 sm:p-12 shadow-xs text-center">
        <h2 className="text-xl font-bold text-ink mb-2">
          {policy?.title || "Chính sách"}
        </h2>
        <div className="py-12 text-slate-400">
          <p className="text-base font-medium">Nội dung đang được cập nhật</p>
        </div>
      </article>
    );
  }

  const hasSections = Array.isArray(policy.sections) && policy.sections.length > 0;

  return (
    <article className="flex-1 rounded-2xl border border-line bg-surface p-6 sm:p-10 shadow-xs">
      {/* 1. Tiêu đề chính */}
      <h1 className="text-2xl font-extrabold text-ink sm:text-3xl leading-tight">
        {policy.title}
      </h1>

      {/* 2. Ngày cập nhật (chỉ hiện khi updatedAt không phải null) */}
      {policy.updatedAt && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted">
          <Calendar className="size-3.5 text-slate-400" />
          <span>Cập nhật ngày: {policy.updatedAt}</span>
        </div>
      )}

      {/* 3. Lời giới thiệu (Intro) */}
      {policy.intro && (
        <div className="mt-5 rounded-2xl border-l-4 border-brand bg-brand-subtle/50 p-4 text-sm leading-relaxed text-slate-700">
          <PolicyText content={policy.intro} />
        </div>
      )}

      {/* 4. Danh sách các phần nội dung (Sections) */}
      {!hasSections ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-base font-medium">Nội dung đang được cập nhật</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8 divide-y divide-line/60">
          {policy.sections!.map((section, sIdx) => (
            <section key={sIdx} className={sIdx > 0 ? "pt-7" : ""}>
              {/* Heading của section */}
              <h2 className="text-lg font-bold text-ink mb-4 sm:text-xl">
                {section.heading}
              </h2>

              {/* Các khối nội dung bên trong section */}
              <div className="space-y-3.5 text-slate-700">
                {section.blocks.map((block, bIdx) => {
                  switch (block.type) {
                    case "p":
                      return (
                        <p key={bIdx} className="text-sm leading-relaxed font-normal">
                          <PolicyText content={block.text} />
                        </p>
                      );

                    case "h3":
                      return (
                        <h3 key={bIdx} className="pt-2 text-sm sm:text-base font-bold text-ink">
                          <PolicyText content={block.text} />
                        </h3>
                      );

                    case "ul":
                      return (
                        <ul key={bIdx} className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                          {block.items.map((item, iIdx) => (
                            <li key={iIdx} className="pl-1">
                              <PolicyText content={item} />
                            </li>
                          ))}
                        </ul>
                      );

                    case "ol":
                      return (
                        <ol key={bIdx} className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
                          {block.items.map((item, iIdx) => (
                            <li key={iIdx} className="pl-1">
                              <PolicyText content={item} />
                            </li>
                          ))}
                        </ol>
                      );

                    case "note":
                      return (
                        <div
                          key={bIdx}
                          className="my-3 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-subtle/60 p-4 text-sm leading-relaxed text-slate-800"
                        >
                          <Info className="size-4 shrink-0 text-brand mt-0.5" />
                          <div className="flex-1">
                            <PolicyText content={block.text} />
                          </div>
                        </div>
                      );

                    case "kv":
                      return (
                        <div
                          key={bIdx}
                          className="my-3 overflow-hidden rounded-xl border border-line bg-surface shadow-xs"
                        >
                          <table className="w-full text-left text-xs sm:text-sm">
                            <tbody className="divide-y divide-line">
                              {block.items.map((item, iIdx) => (
                                <tr key={iIdx} className="hover:bg-canvas/50 transition-colors">
                                  <td className="w-1/3 py-2.5 px-4 font-semibold text-slate-600 bg-canvas/30">
                                    <PolicyText content={item.label} />
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-800 font-medium">
                                    <PolicyText content={item.value} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

