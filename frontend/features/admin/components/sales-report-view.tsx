"use client";

import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
import { AdminPageHeader, DataTable, KpiCard, PeriodChip, Td, Th } from "./admin-ui";
import { ReportsNav } from "./reports-nav";
import {
  categorySales,
  dailySalesVolume,
  productSales,
  reportPeriod,
  salesKpis,
  staffSales,
  timeSales,
} from "../mock/reports";
import { ActionLink, BarChart, Pagination, TabNav } from "@/features/workspace/components/workspace-ui";
import { DemoNotice } from "@/features/workspace/components/demo-notice";

type SalesTab = "product" | "category" | "staff" | "time";

const vnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

export function SalesReportView() {
  const [activeTab, setActiveTab] = useState<SalesTab>("product");

  const tabs = [
    { label: "Theo sản phẩm", active: activeTab === "product", onSelect: () => setActiveTab("product") },
    { label: "Theo danh mục", active: activeTab === "category", onSelect: () => setActiveTab("category") },
    { label: "Theo nhân viên", active: activeTab === "staff", onSelect: () => setActiveTab("staff") },
    { label: "Theo thời gian", active: activeTab === "time", onSelect: () => setActiveTab("time") },
  ];

  const actions = (
    <>
      <PeriodChip period={reportPeriod} />
      <DemoNotice
        label="Xuất Excel"
        icon={<Download className="h-4 w-4" aria-hidden="true" />}
        message="Chức năng xuất báo cáo bán hàng chưa kết nối backend."
      />
    </>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Báo cáo", "Báo cáo bán hàng"]}
        title="Báo cáo bán hàng"
        subtitle="Phân tích hiệu quả bán hàng từ ngày 01 đến 12/10/2026."
        actions={actions}
      />

      <ReportsNav />

      {/* Breakdown selection tabs */}
      <TabNav items={tabs} label="Tiêu chí phân tích bán hàng" />

      {/* 3 KPI cards */}
      <section aria-label="Chỉ số bán hàng chính" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Sản phẩm đã bán"
          value={String(salesKpis.itemsSold)}
          detail={salesKpis.itemsSoldGrowth}
        />
        <KpiCard
          label="Giá trị đơn trung bình"
          value={vnd(salesKpis.averageOrderValue)}
          detail={salesKpis.averageOrderDetail}
        />
        <KpiCard
          label="Danh mục dẫn đầu"
          value={salesKpis.topCategory}
          detail={salesKpis.topCategoryShare}
        />
      </section>

      {/* Daily sales bar chart */}
      <BarChart
        title="Số lượng bán theo ngày"
        subtitle="Đơn vị: sản phẩm"
        data={dailySalesVolume}
        unit="sản phẩm"
      />

      {/* Populated dynamic table based on activeTab */}
      {activeTab === "product" && (
        <DataTable
          caption="Hiệu quả bán hàng theo sản phẩm"
          head={
            <>
              <Th className="w-40">SKU</Th>
              <Th>Sản phẩm / Nhân viên</Th>
              <Th className="w-40">Doanh thu</Th>
              <Th className="w-32">Số lượng</Th>
              <Th className="w-32">Thao tác</Th>
            </>
          }
          footer={<Pagination from={1} to={productSales.length} total={productSales.length} />}
        >
          {productSales.map((row) => (
            <tr key={row.sku} className="hover:bg-canvas/50">
              <Td>
                <Link
                  href={`/admin/products/${row.sku}`}
                  className="font-semibold text-brand hover:underline"
                >
                  {row.sku}
                </Link>
              </Td>
              <Td>
                <div className="min-w-0">
                  <p className="font-semibold">{row.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {row.staff} · {row.orders} đơn · {row.share}
                  </p>
                </div>
              </Td>
              <Td className="font-semibold tabular-nums">{vnd(row.revenue)}</Td>
              <Td className="tabular-nums">
                {row.quantity} {row.unit}
              </Td>
              <Td>
                <ActionLink href={`/admin/products/${row.sku}`}>Chi tiết</ActionLink>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      {activeTab === "category" && (
        <DataTable
          caption="Hiệu quả bán hàng theo danh mục"
          head={
            <>
              <Th>Danh mục</Th>
              <Th className="w-44">Doanh thu</Th>
              <Th className="w-36">Đơn hàng</Th>
              <Th className="w-36">Số lượng bán</Th>
              <Th className="w-44">Tỷ trọng</Th>
            </>
          }
          footer={<Pagination from={1} to={categorySales.length} total={categorySales.length} />}
        >
          {categorySales.map((row) => (
            <tr key={row.category} className="hover:bg-canvas/50">
              <Td className="font-semibold">{row.category}</Td>
              <Td className="font-semibold tabular-nums">{vnd(row.revenue)}</Td>
              <Td className="tabular-nums">{row.orders} đơn</Td>
              <Td className="tabular-nums">{row.quantity} sản phẩm</Td>
              <Td className="text-muted">{row.share}</Td>
            </tr>
          ))}
        </DataTable>
      )}

      {activeTab === "staff" && (
        <DataTable
          caption="Hiệu quả bán hàng theo nhân viên"
          head={
            <>
              <Th>Nhân viên</Th>
              <Th className="w-48">Vai trò</Th>
              <Th className="w-44">Doanh thu</Th>
              <Th className="w-36">Đơn hàng</Th>
              <Th>Sản phẩm bán chạy nhất</Th>
            </>
          }
          footer={<Pagination from={1} to={staffSales.length} total={staffSales.length} />}
        >
          {staffSales.map((row) => (
            <tr key={row.staff} className="hover:bg-canvas/50">
              <Td className="font-semibold">{row.staff}</Td>
              <Td className="text-muted">{row.role}</Td>
              <Td className="font-semibold tabular-nums">{vnd(row.revenue)}</Td>
              <Td className="tabular-nums">{row.orders} đơn</Td>
              <Td className="text-brand font-medium">{row.topProduct}</Td>
            </tr>
          ))}
        </DataTable>
      )}

      {activeTab === "time" && (
        <DataTable
          caption="Hiệu quả bán hàng theo thời gian"
          head={
            <>
              <Th>Khoảng thời gian</Th>
              <Th className="w-48">Doanh thu</Th>
              <Th className="w-40">Số đơn hàng</Th>
              <Th className="w-44">Sản phẩm đã bán</Th>
            </>
          }
          footer={<Pagination from={1} to={timeSales.length} total={timeSales.length} />}
        >
          {timeSales.map((row) => (
            <tr key={row.period} className="hover:bg-canvas/50">
              <Td className="font-semibold">{row.period}</Td>
              <Td className="font-semibold tabular-nums">{vnd(row.revenue)}</Td>
              <Td className="tabular-nums">{row.orders} đơn</Td>
              <Td className="tabular-nums">{row.quantity} sản phẩm</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
