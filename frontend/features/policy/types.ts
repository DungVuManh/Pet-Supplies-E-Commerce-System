// =============================================================
// features/policy/types.ts
// Định nghĩa kiểu dữ liệu cho toàn bộ hệ thống Chính sách (Policy)
// =============================================================

export type PolicyBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; text: string }
  | { type: "kv"; items: Array<{ label: string; value: string }> };

export interface PolicySection {
  heading: string;
  blocks: PolicyBlock[];
}

export interface PolicyItem {
  slug: string;
  label: string;
  title: string;
  showInMenu: boolean;
  updatedAt: string | null;
  intro?: string;
  sections?: PolicySection[];
}

export interface PoliciesData {
  _schema?: unknown;
  policies: PolicyItem[];
}

