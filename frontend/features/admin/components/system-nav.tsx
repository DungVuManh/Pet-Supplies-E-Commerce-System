"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "@/components/workspace/workspace-ui";

const links = [
  { href: "/admin/system/settings", label: "Cấu hình" },
  { href: "/admin/system/policies", label: "Chính sách" },
  { href: "/admin/system/audit-log", label: "Nhật ký" },
];

export function SystemNav() {
  const pathname = usePathname();
  const items = links.map((link) => ({
    label: link.label,
    href: link.href,
    active: pathname === link.href,
  }));

  return <TabNav items={items} label="Hệ thống" />;
}
