// =============================================================
// features/policy/policy-service.ts
// Các hàm tiện ích truy xuất dữ liệu Chính sách từ policies.json
// =============================================================

import policiesData from "./data/policies.json";
import type { PoliciesData, PolicyItem } from "./types";

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

/**
 * Lấy toàn bộ danh sách policy
 */
export function getAllPolicies(): PolicyItem[] {
  return data.policies || [];
}

/**
 * Lấy danh sách policy hiển thị trong Sidebar (showInMenu === true)
 * Giữ đúng thứ tự xuất hiện trong file JSON
 */
export function getMenuPolicies(): PolicyItem[] {
  return (data.policies || []).filter((p) => p.showInMenu === true);
}

/**
 * Tìm kiếm một policy theo slug
 */
export function getPolicyBySlug(slug: string): PolicyItem | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  return (data.policies || []).find((p) => p.slug.toLowerCase() === normalized) || null;
}

/**
 * Lấy danh sách 11 link dành riêng cho Footer
 * Lấy label và slug trực tiếp từ JSON, không phụ thuộc showInMenu
 */
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

