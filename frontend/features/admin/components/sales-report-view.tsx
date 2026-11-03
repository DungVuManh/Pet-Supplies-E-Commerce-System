"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Calendar, Download, RefreshCw } from "lucide-react";
import { AdminPageHeader, DataTable, KpiCard, Stack, Td, Th } from "./admin-ui";
import { ReportsNav } from "./reports-nav";
import { defaultReportPeriod, type ReportPeriod } from "../report-period";
import { ActionLink, BarChart, Pagination, TabNav, control } from "@/components/workspace/workspace-ui";
import { downloadExcelCsv } from "../utils/export-excel";

type SalesTab = "product" | "category" | "staff" | "time";

const vnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

interface SalesKpis {
  itemsSold: number;
  itemsSoldDetail: string;
  averageOrderValue: number;
  averageOrderDetail: string;
  topCategory: string;
  topCategoryShare: string;
}

interface ProductSalesRow {
  sku: string;
  name: string;
  staff: string;
  orders: number;
  share: string;
  revenue: number;
  quantity: number;
  unit: string;
}

interface CategorySalesRow {
  category: string;
  revenue: number;
  orders: number;
  quantity: number;
  share: string;
}

interface StaffSalesRow {
  staff: string;
  role: string;
  revenue: number;
  orders: number;
  topProduct: string;
}

interface TimeSalesRow {
  period: string;
  revenue: number;
  orders: number;
  quantity: number;
}

export function SalesReportView({ period = defaultReportPeriod }: { period?: ReportPeriod }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SalesTab>("product");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(period.from);
  const [dateTo, setDateTo] = useState(period.to);
  const [appliedPeriod, setAppliedPeriod] = useState(period);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Dữ liệu từ API Backend MongoDB thực tế
  const [kpis, setKpis] = useState<SalesKpis | null>(null);
  const [dailySalesVolume, setDailySalesVolume] = useState<{ label: string; value: number }[]>([]);
  const [productSales, setProductSales] = useState<ProductSalesRow[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesRow[]>([]);
  const [staffSales, setStaffSales] = useState<StaffSalesRow[]>([]);
  const [timeSales, setTimeSales] = useState<TimeSalesRow[]>([]);

  const fetchSalesData = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/admin/reports/sales/summary?dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        let serverMessage = "Không thể tải báo cáo bán hàng từ máy chủ";
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) serverMessage = errJson.error.message;
        } catch {
          // ignore parse error
        }
        throw new Error(serverMessage);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error("Dữ liệu phản hồi từ máy chủ không hợp lệ");
      }

      const d = json.data;
      setKpis(d.kpis ?? null);
      setDailySalesVolume(Array.isArray(d.dailySalesVolume) ? d.dailySalesVolume : []);
      setProductSales(Array.isArray(d.productSales) ? d.productSales : []);
      setCategorySales(Array.isArray(d.categorySales) ? d.categorySales : []);
      setStaffSales(Array.isArray(d.staffSales) ? d.staffSales : []);
      setTimeSales(Array.isArray(d.timeSales) ? d.timeSales : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối cơ sở dữ liệu");
      setKpis(null);
      setDailySalesVolume([]);
      setProductSales([]);
      setCategorySales([]);
      setStaffSales([]);
      setTimeSales([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSalesData(appliedPeriod.from, appliedPeriod.to);
  }, [appliedPeriod, fetchSalesData]);

  const handleApplyFilter = () => {
    if (dateFrom && dateTo && dateFrom <= dateTo) {
      const [y1, m1, d1] = dateFrom.split("-");
      const [y2, m2, d2] = dateTo.split("-");
      const label = `${d1}/${m1}/${y1} – ${d2}/${m2}/${y2}`;
      setAppliedPeriod({ from: dateFrom, to: dateTo, label });
      setIsCustomRangeOpen(false);
    }
  };

  const tabs = [
    { label: "Theo sản phẩm", active: activeTab === "product", onSelect: () => setActiveTab("product") },
    { label: "Theo danh mục", active: activeTab === "category", onSelect: () => setActiveTab("category") },
    { label: "Theo nhân viên", active: activeTab === "staff", onSelect: () => setActiveTab("staff") },
    { label: "Theo thời gian", active: activeTab === "time", onSelect: () => setActiveTab("time") },
  ];

  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      downloadExcelCsv({
        filename: `Bao_cao_ban_hang_${appliedPeriod.from}_${appliedPeriod.to}`,
        title: "BÁO CÁO BÁN HÀNG",
        period: appliedPeriod.label,
        sections: [
          {
            title: "1. Hiệu quả bán hàng (KPI)",
            headers: ["Chỉ số", "Giá trị", "Ghi chú"],
            rows: [
              ["Số lượng sản phẩm bán ra", (kpis?.itemsSold ?? 0).toLocaleString("vi-VN"), kpis?.itemsSoldDetail ?? ""],
              ["Giá trị trung bình đơn (AOV)", (kpis?.averageOrderValue ?? 0).toLocaleString("vi-VN") + " ₫", kpis?.averageOrderDetail ?? ""],
              ["Danh mục bán chạy nhất", kpis?.topCategory ?? "", kpis?.topCategoryShare ?? ""],
            ],
          },
          {
            title: "2. Doanh số theo sản phẩm",
            headers: ["Mã SKU", "Tên sản phẩm", "Nhân viên phụ trách", "Số đơn", "Số lượng bán", "Đơn vị", "Doanh thu (VNĐ)", "Tỷ trọng"],
            rows: (productSales ?? []).map((prod) => [
              prod.sku,
              prod.name,
              prod.staff,
              prod.orders,
              prod.quantity,
              prod.unit,
              prod.revenue.toLocaleString("vi-VN"),
              prod.share,
            ]),
          },
          {
            title: "3. Doanh số theo danh mục",
            headers: ["Danh mục", "Doanh thu (VNĐ)", "Số đơn", "Số lượng bán", "Tỷ trọng"],
            rows: (categorySales ?? []).map((cat) => [
              cat.category,
              cat.revenue.toLocaleString("vi-VN"),
              cat.orders,
              cat.quantity,
              cat.share,
            ]),
          },
          {
            title: "4. Doanh số theo nhân viên",
            headers: ["Nhân viên / Kênh", "Vai trò", "Doanh thu (VNĐ)", "Số đơn", "Sản phẩm chủ lực"],
            rows: (staffSales ?? []).map((staff) => [
              staff.staff,
              staff.role,
              staff.revenue.toLocaleString("vi-VN"),
              staff.orders,
              staff.topProduct,
            ]),
          },
          {
            title: "5. Doanh số theo thời gian",
            headers: ["Thời gian", "Doanh thu (VNĐ)", "Số đơn", "Số lượng bán"],
            rows: (timeSales ?? []).map((time) => [
              time.period,
              time.revenue.toLocaleString("vi-VN"),
              time.orders,
              time.quantity,
            ]),
          },
          {
            title: "6. Số lượng bán theo ngày",
            headers: ["Ngày", "Số lượng sản phẩm bán"],
            rows: (dailySalesVolume ?? []).map((d) => [d.label, d.value]),
          },
        ],
      });
    } finally {
      setTimeout(() => setIsExporting(false), 300);
    }
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsCustomRangeOpen(!isCustomRangeOpen)}
          className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-4 font-semibold hover:bg-canvas/60 transition-colors"
          aria-label={`Kỳ báo cáo ${appliedPeriod.label}`}
        >
          <Calendar className="h-4 w-4 text-muted" aria-hidden="true" />
          <span>{appliedPeriod.label}</span>
          {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted" aria-hidden="true" />}
        </button>

        {isCustomRangeOpen && (
          <div className="absolute right-0 top-14 z-20 w-80 rounded-lg border border-line bg-surface p-4 shadow-lg">
            <p className="text-sm font-semibold mb-3">Chọn khoảng thời gian</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="sales-from-date" className="block text-xs text-muted mb-1">
                  Từ ngày
                </label>
                <input
                  id="sales-from-date"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`w-full ${control}`}
                />
              </div>
              <div>
                <label htmlFor="sales-to-date" className="block text-xs text-muted mb-1">
                  Đến ngày
                </label>
                <input
                  id="sales-to-date"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={`w-full ${control}`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomRangeOpen(false)}
                  className="rounded px-3 py-1.5 text-xs text-muted hover:bg-canvas"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilter}
                  disabled={!dateFrom || !dateTo || dateFrom > dateTo}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleExportExcel}
        disabled={loading || isExporting}
        className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-4 font-semibold hover:bg-canvas/60 transition-colors disabled:opacity-50"
        aria-label="Xuất file Excel báo cáo bán hàng"
      >
        {isExporting ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4 text-muted" aria-hidden="true" />
        )}
        <span>{isExporting ? "Đang xuất..." : "Xuất Excel"}</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Báo cáo", "Báo cáo bán hàng"]}
        title="Báo cáo bán hàng"
        subtitle={`Phân tích hiệu quả bán hàng thực tế từ cơ sở dữ liệu (${appliedPeriod.label}).`}
        actions={actions}
      />

      <ReportsNav period={appliedPeriod} />

      {/* Hiển thị lỗi nếu API thất bại */}
      {error && !loading && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-danger">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Chưa thể tải báo cáo bán hàng</h3>
              <p className="mt-1 text-sm text-muted">{error}</p>
              <button
                type="button"
                onClick={() => fetchSalesData(appliedPeriod.from, appliedPeriod.to)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Thử tải lại</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown selection tabs */}
      <TabNav items={tabs} label="Tiêu chí phân tích bán hàng" />

      {/* Trạng thái Loading KPI */}
      {loading && !kpis && (
        <section aria-label="Đang tải chỉ số bán hàng" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-line bg-surface p-6 h-36">
              <div className="h-4 w-28 bg-canvas rounded mb-3" />
              <div className="h-8 w-36 bg-canvas rounded mb-3" />
              <div className="h-3 w-32 bg-canvas rounded" />
            </div>
          ))}
        </section>
      )}

      {/* 3 KPI cards thực tế từ MongoDB */}
      {kpis && (
        <section aria-label="Chỉ số bán hàng chính" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Sản phẩm đã bán"
            value={String(kpis.itemsSold)}
            detail={kpis.itemsSoldDetail}
          />
          <KpiCard
            label="Giá trị đơn trung bình"
            value={vnd(kpis.averageOrderValue)}
            detail={kpis.averageOrderDetail}
          />
          <KpiCard
            label="Danh mục dẫn đầu"
            value={kpis.topCategory}
            detail={kpis.topCategoryShare}
          />
        </section>
      )}

      {/* Biểu đồ cột: Số lượng bán theo ngày */}
      {dailySalesVolume.length > 0 ? (
        <BarChart
          title="Số lượng bán theo ngày"
          subtitle="Đơn vị: sản phẩm"
          data={dailySalesVolume}
          unit="sản phẩm"
        />
      ) : (
        !loading &&
        !error && (
          <section className="rounded-lg border border-line bg-surface p-6">
            <h2 className="text-xl font-semibold">Số lượng bán theo ngày</h2>
            <p className="mt-4 text-sm text-muted">
              Chưa có dữ liệu bán hàng trong khoảng thời gian đã chọn để vẽ biểu đồ.
            </p>
          </section>
        )
      )}

      {/* Tab 1: Hiệu quả bán hàng theo sản phẩm */}
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
          footer={
            <Pagination
              from={productSales.length > 0 ? 1 : 0}
              to={productSales.length}
              total={productSales.length}
            />
          }
        >
          {productSales.length > 0 ? (
            productSales.map((row) => (
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
            ))
          ) : (
            <tr>
              <Td colSpan={5} className="text-center text-muted py-8">
                Không có dữ liệu bán hàng theo sản phẩm trong khoảng thời gian này.
              </Td>
            </tr>
          )}
        </DataTable>
      )}

      {/* Tab 2: Hiệu quả bán hàng theo danh mục */}
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
          footer={
            <Pagination
              from={categorySales.length > 0 ? 1 : 0}
              to={categorySales.length}
              total={categorySales.length}
            />
          }
        >
          {categorySales.length > 0 ? (
            categorySales.map((row) => (
              <tr key={row.category} className="hover:bg-canvas/50">
                <Td className="font-semibold">{row.category}</Td>
                <Td className="font-semibold tabular-nums">{vnd(row.revenue)}</Td>
                <Td className="tabular-nums">{row.orders} đơn</Td>
                <Td className="tabular-nums">{row.quantity} sản phẩm</Td>
                <Td className="text-muted">{row.share}</Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={5} className="text-center text-muted py-8">
                Không có dữ liệu bán hàng theo danh mục trong khoảng thời gian này.
              </Td>
            </tr>
          )}
        </DataTable>
      )}

      {/* Tab 3: Hiệu quả bán hàng theo nhân viên */}
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
          footer={
            <Pagination
              from={staffSales.length > 0 ? 1 : 0}
              to={staffSales.length}
              total={staffSales.length}
            />
          }
        >
          {staffSales.length > 0 ? (
            staffSales.map((row) => (
              <tr key={row.staff} className="hover:bg-canvas/50">
                <Td className="font-semibold">{row.staff}</Td>
                <Td className="text-muted">{row.role}</Td>
                <Td className="font-semibold tabular-nums">{vnd(row.revenue)}</Td>
                <Td className="tabular-nums">{row.orders} đơn</Td>
                <Td className="text-brand font-medium">{row.topProduct}</Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={5} className="text-center text-muted py-8">
                Không có dữ liệu bán hàng theo nhân viên trong khoảng thời gian này.
              </Td>
            </tr>
          )}
        </DataTable>
      )}

      {/* Tab 4: Hiệu quả bán hàng theo thời gian */}
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
          footer={
            <Pagination
              from={timeSales.length > 0 ? 1 : 0}
              to={timeSales.length}
              total={timeSales.length}
            />
          }
        >
          {timeSales.length > 0 ? (
            timeSales.map((row) => (
              <tr key={row.period} className="hover:bg-canvas/50">
                <Td className="font-semibold">{row.period}</Td>
                <Td className="font-semibold tabular-nums">{vnd(row.revenue)}</Td>
                <Td className="tabular-nums">{row.orders} đơn</Td>
                <Td className="tabular-nums">{row.quantity} sản phẩm</Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={4} className="text-center text-muted py-8">
                Không có dữ liệu bán hàng theo thời gian trong khoảng thời gian này.
              </Td>
            </tr>
          )}
        </DataTable>
      )}
    </div>
  );
}
