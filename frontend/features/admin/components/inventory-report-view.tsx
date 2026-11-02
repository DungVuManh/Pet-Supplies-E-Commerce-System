"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Calendar, Download, RefreshCw } from "lucide-react";
import { AdminPageHeader, DataTable, KpiCard, StatusBadge, Td, Th } from "./admin-ui";
import { ReportsNav } from "./reports-nav";
import { Pagination, card, control, secondaryButton } from "@/components/workspace/workspace-ui";
import { downloadExcelCsv } from "../utils/export-excel";
import type { AdminStatus } from "../status";

export type InventoryReportRow = {
  sku: string;
  name: string;
  category: string;
  opening: number;
  inQty: number;
  outQty: number;
  closing: number;
  threshold: number;
  warning: Extract<AdminStatus, "Đủ hàng" | "Sắp hết" | "Hết hàng">;
};

interface InventoryKpis {
  closingTotal: number;
  catalogSkus: number;
  inTotal: number;
  inReceipts: number;
  outTotal: number;
  outOrders: number;
  lowStockCount: number;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  from: number;
  to: number;
}

export function InventoryReportView() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc
  const [searchInput, setSearchInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("Tất cả danh mục");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("Tất cả danh mục");

  // Thời gian
  const [dateFrom, setDateFrom] = useState("2026-10-01");
  const [dateTo, setDateTo] = useState("2026-10-31");
  const [appliedPeriod, setAppliedPeriod] = useState({
    from: "2026-10-01",
    to: "2026-10-31",
    label: "01/10/2026 – 31/10/2026",
  });
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);

  // Phân trang
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dữ liệu từ API Backend MongoDB thực tế
  const [kpis, setKpis] = useState<InventoryKpis | null>(null);
  const [rows, setRows] = useState<InventoryReportRow[]>([]);
  const [categories, setCategories] = useState<string[]>(["Tất cả danh mục"]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 10,
    total: 0,
    pages: 1,
    from: 0,
    to: 0,
  });

  const fetchInventoryData = useCallback(
    async (from: string, to: string, q: string, cat: string, pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          dateFrom: from,
          dateTo: to,
          q,
          category: cat,
          page: String(pageNum),
          pageSize: String(pageSize),
        });

        const res = await fetch(`/api/v1/admin/reports/inventory?${params.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          let serverMessage = "Không thể tải báo cáo tồn kho từ máy chủ";
          try {
            const errJson = await res.json();
            if (errJson?.error?.message) serverMessage = errJson.error.message;
          } catch {
            // ignore
          }
          throw new Error(serverMessage);
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error("Dữ liệu phản hồi từ máy chủ không hợp lệ");
        }

        const d = json.data;
        setKpis(d.kpis ?? null);
        setRows(Array.isArray(d.items) ? d.items : []);
        if (Array.isArray(d.categories) && d.categories.length > 0) {
          setCategories(d.categories);
        }
        if (d.pagination) {
          setPagination(d.pagination);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối cơ sở dữ liệu");
        setRows([]);
        setKpis(null);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, router],
  );

  useEffect(() => {
    fetchInventoryData(
      appliedPeriod.from,
      appliedPeriod.to,
      appliedSearch,
      appliedCategory,
      page,
    );
  }, [appliedPeriod, appliedSearch, appliedCategory, page, fetchInventoryData]);

  const handleApplyFilter = () => {
    setPage(1);
    setAppliedSearch(searchInput);
    setAppliedCategory(categoryInput);
  };

  const handleApplyDateRange = () => {
    if (dateFrom && dateTo && dateFrom <= dateTo) {
      const [y1, m1, d1] = dateFrom.split("-");
      const [y2, m2, d2] = dateTo.split("-");
      const label = `${d1}/${m1}/${y1} – ${d2}/${m2}/${y2}`;
      setPage(1);
      setAppliedPeriod({ from: dateFrom, to: dateTo, label });
      setIsCustomRangeOpen(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      let itemsToExport = rows;

      try {
        const params = new URLSearchParams({
          dateFrom: appliedPeriod.from,
          dateTo: appliedPeriod.to,
          q: appliedSearch,
          category: appliedCategory,
          page: "1",
          pageSize: "1000",
        });
        const res = await fetch(`/api/v1/admin/reports/inventory?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.items && Array.isArray(json.data.items)) {
            itemsToExport = json.data.items;
          }
        }
      } catch {
        // Fallback vào rows hiện tại
      }

      downloadExcelCsv({
        filename: `Bao_cao_ton_kho_${appliedPeriod.from}_${appliedPeriod.to}`,
        title: "BÁO CÁO XUẤT NHẬP TỒN KHO",
        period: appliedPeriod.label,
        sections: [
          {
            title: "1. Tổng quan kho hàng (KPI)",
            headers: ["Chỉ số", "Giá trị"],
            rows: [
              ["Tổng tồn kho cuối kỳ", (kpis?.closingTotal ?? 0).toLocaleString("vi-VN")],
              ["Tổng số SKU quản lý", (kpis?.catalogSkus ?? 0).toLocaleString("vi-VN")],
              ["Tổng số lượng nhập trong kỳ", (kpis?.inTotal ?? 0).toLocaleString("vi-VN")],
              ["Số phiếu nhập trong kỳ", (kpis?.inReceipts ?? 0).toLocaleString("vi-VN")],
              ["Tổng số lượng xuất trong kỳ", (kpis?.outTotal ?? 0).toLocaleString("vi-VN")],
              ["Số đơn hàng xuất trong kỳ", (kpis?.outOrders ?? 0).toLocaleString("vi-VN")],
              ["SKU dưới định mức (Cảnh báo)", (kpis?.lowStockCount ?? 0).toLocaleString("vi-VN")],
            ],
          },
          {
            title: "2. Chi tiết xuất nhập tồn kho",
            headers: [
              "Mã SKU",
              "Tên sản phẩm",
              "Danh mục",
              "Tồn đầu",
              "Nhập kỳ",
              "Xuất kỳ",
              "Tồn cuối",
              "Định mức tối thiểu",
              "Trạng thái cảnh báo",
            ],
            rows: itemsToExport.map((r) => [
              r.sku,
              r.name,
              r.category,
              r.opening,
              r.inQty,
              r.outQty,
              r.closing,
              r.threshold,
              r.warning,
            ]),
          },
        ],
      });
    } finally {
      setIsExporting(false);
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
                <label htmlFor="inv-from-date" className="block text-xs text-muted mb-1">
                  Từ ngày
                </label>
                <input
                  id="inv-from-date"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`w-full ${control}`}
                />
              </div>
              <div>
                <label htmlFor="inv-to-date" className="block text-xs text-muted mb-1">
                  Đến ngày
                </label>
                <input
                  id="inv-to-date"
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
                  onClick={handleApplyDateRange}
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
        disabled={isExporting || loading || !kpis}
        className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-4 font-semibold hover:bg-canvas/60 transition-colors disabled:opacity-50"
        aria-label="Xuất file Excel báo cáo tồn kho"
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
        breadcrumbs={["Báo cáo", "Báo cáo tồn kho"]}
        title="Báo cáo tồn kho"
        subtitle={`Nhập – xuất – tồn từ cơ sở dữ liệu (${appliedPeriod.label}).`}
        actions={actions}
      />

      <ReportsNav />

      {/* Thông báo lỗi khi API thất bại */}
      {error && !loading && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-danger">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Chưa thể tải báo cáo tồn kho</h3>
              <p className="mt-1 text-sm text-muted">{error}</p>
              <button
                type="button"
                onClick={() =>
                  fetchInventoryData(
                    appliedPeriod.from,
                    appliedPeriod.to,
                    appliedSearch,
                    appliedCategory,
                    page,
                  )
                }
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Thử tải lại</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trạng thái Loading KPI */}
      {loading && !kpis && (
        <section aria-label="Đang tải chỉ số tồn kho" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-line bg-surface p-6 h-36">
              <div className="h-4 w-28 bg-canvas rounded mb-3" />
              <div className="h-8 w-36 bg-canvas rounded mb-3" />
              <div className="h-3 w-32 bg-canvas rounded" />
            </div>
          ))}
        </section>
      )}

      {/* 4 KPI cards thực tế từ MongoDB */}
      {kpis && (
        <section aria-label="Chỉ số tồn kho chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tồn kho cuối kỳ"
            value={kpis.closingTotal.toLocaleString("vi-VN")}
            detail={`${kpis.catalogSkus} mã sản phẩm`}
          />
          <KpiCard
            label="Nhập trong kỳ"
            value={kpis.inTotal.toLocaleString("vi-VN")}
            detail={`${kpis.inReceipts} phiếu nhập`}
          />
          <KpiCard
            label="Xuất trong kỳ"
            value={String(kpis.outTotal)}
            detail={`${kpis.outOrders} đơn bán hàng`}
          />
          <KpiCard
            label="Dưới định mức"
            value={`${kpis.lowStockCount} sản phẩm`}
            detail="Cần bổ sung ngay"
            tone={kpis.lowStockCount > 0 ? "warning" : "default"}
          />
        </section>
      )}

      {/* Hàng bộ lọc tìm kiếm và danh mục */}
      <section className={`${card} p-6`}>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_240px_auto]">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="inv-rep-search" className="font-medium">
              Tìm kiếm
            </label>
            <input
              id="inv-rep-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
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
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
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

      {/* Bảng tồn kho có phân trang kết nối 100% MongoDB */}
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
          <div className="space-y-2">
            <div className="border-t border-line px-6 py-3 text-xs text-muted flex flex-wrap justify-between items-center gap-2">
              <span>
                {pagination.total} / {kpis?.catalogSkus ?? pagination.total} mã sản phẩm · Tồn cuối = Tồn đầu + Nhập − Xuất
              </span>
            </div>
            <Pagination
              from={pagination.from}
              to={pagination.to}
              total={pagination.total}
              page={pagination.page}
              pages={pagination.pages}
              onPage={(newPage) => setPage(newPage)}
            />
          </div>
        }
      >
        {rows.length > 0 ? (
          rows.map((row) => (
            <tr key={row.sku} className="hover:bg-canvas/50">
              <Td>
                <Link
                  href={`/admin/products/${row.sku}`}
                  className="font-semibold text-brand hover:underline"
                >
                  {row.sku}
                </Link>
              </Td>
              <Td className="font-medium">
                <div>
                  <p>{row.name}</p>
                  <p className="text-xs text-muted mt-0.5">{row.category}</p>
                </div>
              </Td>
              <Td className="text-right tabular-nums">{row.opening}</Td>
              <Td className="text-right tabular-nums text-success">+{row.inQty}</Td>
              <Td className="text-right tabular-nums text-ink">−{row.outQty}</Td>
              <Td className="text-right font-semibold tabular-nums">{row.closing}</Td>
              <Td className="text-right tabular-nums text-muted">{row.threshold}</Td>
              <Td>
                <StatusBadge status={row.warning} />
              </Td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={8} className="border-t border-line px-6 py-10 text-center text-muted">
              {loading ? "Đang tải dữ liệu tồn kho..." : "Không tìm thấy sản phẩm nào khớp với bộ lọc."}
            </td>
          </tr>
        )}
      </DataTable>
    </div>
  );
}
