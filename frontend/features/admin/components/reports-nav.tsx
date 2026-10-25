"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "@/features/workspace/components/workspace-ui";

const links = [
  { href: "/admin/reports/finance", label: "Tài chính" },
  { href: "/admin/reports/sales", label: "Bán hàng" },
  { href: "/admin/reports/inventory", label: "Tồn kho" },
];

export function ReportsNav() {
  const pathname = usePathname();
  const items = links.map((link) => ({
    label: link.label,
    href: link.href,
    active: pathname === link.href,
  }));

  return <TabNav items={items} label="Báo cáo" />;
}
