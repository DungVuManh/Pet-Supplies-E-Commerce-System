// =============================================================
// app/(customer)/policy/page.tsx
// Route mặc định: Chuyển hướng sang /policy/chinh-sach-van-chuyen
// =============================================================

import { redirect } from "next/navigation";
import { DEFAULT_POLICY_SLUG } from "@/features/policy";

export const instant = false;

export default function PolicyIndexPage() {
  redirect(`/policy/${DEFAULT_POLICY_SLUG}`);
}
