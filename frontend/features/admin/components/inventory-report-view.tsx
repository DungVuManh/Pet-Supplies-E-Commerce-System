"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { AdminPageHeader, DataTable, KpiCard, StatusBadge, Td, Th } from "./admin-ui";
import { ReportsNav } from "./reports-nav";
import {
  filterInventoryReport,
  inventoryKpis,
  inventoryReportRows,
  reportPeriod,
} from "../mock/reports";
import { card, control, secondaryButton } from "@/features/workspace/components/workspace-ui";
import { DemoNotice } from "@/features/workspace/components/demo-notice";

const CATEGORIES = [
  "Tất cả danh mục",
  "Thức ăn cho chó",
  "Thức ăn cho mèo",
  "Vệ sinh & chăm sóc",
  "Đồ chơi",
  "Phụ kiện",
];

export function InventoryReportView() {
  const [searchInput, setSearchInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("Tất cả danh mục");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("Tất cả danh mục");

  const handleApplyFilter = () => {
    setAppliedSearch(searchInput);
    setAppliedCategory(categoryInput);
  };

  const filteredRows = useMemo(() => {
    return filterInventoryReport(inventoryReportRows, {
      search: appliedSearch,
      category: appliedCategory,
    });
  }, [appliedSearch, appliedCategory]);

  const actions = (
    <DemoNotice
      label="Xuất Excel"
      icon={<Download className="h-4 w-4" aria-hidden="true" />}
      message="Chức năng xuất báo cáo tồn kho chưa kết nối backend."
    />
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Báo cáo", "Báo cáo tồn kho"]}
        title="Báo cáo tồn kho"
        subtitle={`Nhập – xuất – tồn từ 01 đến 12/10/2026 · Kho TP. Hồ Chí Minh`}
        actions={actions}
      />

      <ReportsNav />

      {/* 4 KPI cards */}
      <section aria-label="Chỉ số tồn kho chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tồn kho cuối kỳ"
          value={inventoryKpis.closingTotal.toLocaleString("vi-VN")}
          detail={`${inventoryKpis.catalogSkus} mã sản phẩm`}
        />
        <KpiCard
          label="Nhập trong kỳ"
          value={inventoryKpis.inTotal.toLocaleString("vi-VN")}
          detail={`${inventoryKpis.inReceipts} phiếu nhập`}
        />
        <KpiCard
          label="Xuất trong kỳ"
          value={String(inventoryKpis.outTotal)}
          detail={`${inventoryKpis.outOrders} đơn bán hàng`}
        />
        <KpiCard
          label="Dưới định mức"
          value={`${inventoryKpis.lowStockCount} sản phẩm`}
          detail="Cần bổ sung ngay"
          tone="warning"
        />
      </section>

      {/* Filter Row */}
      <section className={`${card} p-6`}>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_180px_auto]">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="inv-rep-search" className="font-medium">
              Tìm kiếm
            </label>
            <input
              id="inv-rep-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tên sản phẩm hoặc SKU"
              className={control}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="inv-rep-category" className="font-medium">
              Danh mục
            </label>
            <select
              id="inv-rep-category"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className={control}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="inv-rep-period" className="font-medium">
              Khoảng thời gian
            </label>
            <select id="inv-rep-period" defaultValue={reportPeriod} className={control}>
              <option value={reportPeriod}>{reportPeriod}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleApplyFilter}
            className={`${secondaryButton} h-12`}
          >
            Lọc dữ liệu
          </button>
        </div>
      </section>

      {/* Populated Inventory Table */}
      <DataTable
        caption="Báo cáo nhập xuất tồn chi tiết"
        head={
          <>
            <Th className="w-36">SKU</Th>
            <Th>Sản phẩm</Th>
            <Th className="w-24 text-right">Đầu kỳ</Th>
            <Th className="w-24 text-right">Nhập</Th>
            <Th className="w-24 text-right">Xuất</Th>
            <Th className="w-28 text-right">Cuối kỳ</Th>
            <Th className="w-28 text-right">Định mức</Th>
            <Th className="w-36">Cảnh báo</Th>
          </>
        }
        footer={
          <div className="border-t border-line px-6 py-4 text-xs text-muted">
            {filteredRows.length} / {inventoryKpis.catalogSkus} mã sản phẩm · Tồn cuối = Tồn đầu + Nhập − Xuất
          </div>
        }
      >
        {filteredRows.map((row) => (
          <tr key={row.sku} className="hover:bg-canvas/50">
            <Td>
              <Link
                href={`/admin/products/${row.sku}`}
                className="font-semibold text-brand hover:underline"
              >
                {row.sku}
              </Link>
            </Td>
            <Td className="font-medium">{row.name}</Td>
            <Td className="text-right tabular-nums">{row.opening}</Td>
            <Td className="text-right tabular-nums text-success">+{row.inQty}</Td>
            <Td className="text-right tabular-nums text-ink">−{row.outQty}</Td>
            <Td className="text-right font-semibold tabular-nums">{row.closing}</Td>
            <Td className="text-right tabular-nums text-muted">{row.threshold}</Td>
            <Td>
              <StatusBadge status={row.warning} />
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
