"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "@/components/workspace/workspace-ui";
import { reportHref, type ReportPeriod } from "../report-period";

const links = [
  { href: "/admin/reports/finance", label: "Tài chính" },
  { href: "/admin/reports/sales", label: "Bán hàng" },
  { href: "/admin/reports/inventory", label: "Tồn kho" },
];

export function ReportsNav({ period }: { period: ReportPeriod }) {
  const pathname = usePathname();
  const items = links.map((link) => ({
    label: link.label,
    href: reportHref(link.href, period),
    active: pathname === link.href,
  }));

  return <TabNav items={items} label="Báo cáo" />;
}
