// =============================================================
// features/policy/policy-service.ts
// Các hàm tiện ích truy xuất dữ liệu Chính sách từ backend và policies.json
// =============================================================

import policiesData from "./data/policies.json";
import type { PoliciesData, PolicyItem, PolicySection } from "./types";

const data = policiesData as PoliciesData;

export const DEFAULT_POLICY_SLUG = "chinh-sach-van-chuyen";

// Danh sách 11 slug hiển thị ở Footer theo đúng thứ tự yêu cầu
export const FOOTER_POLICY_SLUGS = [
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
] as const;

export function getAllPolicies(): PolicyItem[] {
  return data.policies || [];
}

export function getMenuPolicies(): PolicyItem[] {
  return (data.policies || []).filter((p) => p.showInMenu === true);
}

export function getStaticPolicyBySlug(slug: string): PolicyItem | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  return (data.policies || []).find((p) => p.slug.toLowerCase() === normalized) || null;
}

export function parseContentToSections(content: string): PolicySection[] {
  if (!content || !content.trim()) return [];

  const rawParagraphs = content.split(/\n\s*\n/);
  const sections: PolicySection[] = [];
  let currentSection: PolicySection | null = null;

  for (const blockText of rawParagraphs) {
    const trimmed = blockText.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    const isHeading = /^(?:(?:\d+\.|\#\#)\s*)/.test(firstLine);

    if (isHeading) {
      currentSection = { heading: firstLine, blocks: [] };
      sections.push(currentSection);
      const remainingLines = lines.slice(1);
      if (remainingLines.length > 0) {
        appendLinesToSection(remainingLines, currentSection);
      }
    } else {
      if (!currentSection) {
        currentSection = { heading: "Quy định & Chi tiết chính sách", blocks: [] };
        sections.push(currentSection);
      }
      appendLinesToSection(lines, currentSection);
    }
  }

  return sections;
}

function appendLinesToSection(lines: string[], section: PolicySection) {
  const ulItems: string[] = [];
  for (const line of lines) {
    if (line.startsWith("- ") || line.startsWith("* ")) {
      ulItems.push(line.slice(2).trim());
    } else {
      if (ulItems.length > 0) {
        section.blocks.push({ type: "ul", items: [...ulItems] });
        ulItems.length = 0;
      }
      section.blocks.push({ type: "p", text: line });
    }
  }
  if (ulItems.length > 0) {
    section.blocks.push({ type: "ul", items: [...ulItems] });
  }
}

/**
 * Lấy chi tiết một policy từ backend thật (nếu đã lưu & công bố).
 * Nếu không kết nối được hoặc policy chỉ có ở file tĩnh thì fallback sang policies.json.
 */
export async function getPolicyBySlug(slug: string): Promise<PolicyItem | null> {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  const staticPolicy = getStaticPolicyBySlug(normalized);

  const backendUrl =
    process.env.BACKEND_ORIGIN ||
    (typeof window === "undefined" ? "http://127.0.0.1:3001" : "");

  try {
    const res = await fetch(`${backendUrl}/api/v1/policies/${encodeURIComponent(normalized)}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const backendPolicy = json.data;
        const dynamicSections = parseContentToSections(backendPolicy.content);

        return {
          slug: backendPolicy.slug || normalized,
          label: staticPolicy?.label || backendPolicy.title,
          title: backendPolicy.title,
          showInMenu: staticPolicy ? staticPolicy.showInMenu : true,
          updatedAt: backendPolicy.effectiveDate || (backendPolicy.updatedAt ? new Date(backendPolicy.updatedAt).toLocaleDateString("vi-VN") : null),
          intro: staticPolicy?.intro,
          sections: dynamicSections.length > 0 ? dynamicSections : staticPolicy?.sections || [],
        };
      }
    }
  } catch {
    // Network / server not reachable: fall back to static
  }

  return staticPolicy;
}

export function getFooterPolicyLinks(): Array<{ slug: string; label: string }> {
  const policyMap = new Map<string, PolicyItem>();
  for (const p of data.policies || []) {
    policyMap.set(p.slug, p);
  }

  const result: Array<{ slug: string; label: string }> = [];
  for (const slug of FOOTER_POLICY_SLUGS) {
    const policy = policyMap.get(slug);
    if (policy) {
      result.push({
        slug: policy.slug,
        label: policy.label,
      });
    }
  }

  return result;
}
