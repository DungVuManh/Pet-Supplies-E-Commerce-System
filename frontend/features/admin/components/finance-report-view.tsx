"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Calendar, Download, RefreshCw } from "lucide-react";
import { AdminPageHeader, DataTable, KpiCard, StatusBadge, Stack, Td, Th } from "./admin-ui";
import { ReportsNav } from "./reports-nav";
import { defaultReportPeriod, type ReportPeriod } from "../report-period";
import { ActionLink, LineChart, Pagination, control } from "@/components/workspace/workspace-ui";
import { downloadExcelCsv } from "../utils/export-excel";
import type { AdminStatus } from "../status";

const vnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

interface FinanceKpis {
  grossRevenue: number;
  grossOrders: number;
  refunds: number;
  refundTransactions: number;
  netRevenue: number;
  pendingReconciliation: number;
  pendingTransactions: number;
}

interface PaymentChannelRow {
  id: string;
  channel: string;
  channelName: string;
  detailTitle: string;
  income: number;
  refund: number;
  transactions: number;
  net: number;
  status: Extract<AdminStatus, "Đã đối soát" | "Chờ đối soát">;
}

interface ChartPoint {
  label: string;
  value: number;
}

export function FinanceReportView({ period = defaultReportPeriod }: { period?: ReportPeriod }) {
  const router = useRouter();

  const [dateFrom, setDateFrom] = useState(period.from);
  const [dateTo, setDateTo] = useState(period.to);
  const [appliedPeriod, setAppliedPeriod] = useState(period);

  // Dữ liệu nghiệp vụ thuần túy từ MongoDB (không dùng bất kỳ mock data nào làm khởi tạo)
  const [kpis, setKpis] = useState<FinanceKpis | null>(null);
  const [chart, setChart] = useState<ChartPoint[] | null>(null);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannelRow[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Gọi trực tiếp API Backend kết nối MongoDB thực tế
  const fetchFinanceData = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/admin/reports/finance/summary?dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`,
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
        let serverMessage = "Không thể tải báo cáo từ máy chủ";
        try {
          const errJson = await res.json();
          if (errJson?.message) serverMessage = errJson.message;
        } catch {
          // ignore json parse error
        }
        throw new Error(serverMessage);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error("Dữ liệu phản hồi từ máy chủ không hợp lệ");
      }

      const d = json.data;
      // Cập nhật toàn bộ KPI từ backend, kể cả khi tất cả giá trị đều bằng 0
      setKpis({
        grossRevenue: d.grossRevenue ?? 0,
        grossOrders: d.grossOrders ?? 0,
        refunds: d.refunds ?? 0,
        refundTransactions: d.refundTransactions ?? 0,
        netRevenue: d.netRevenue ?? 0,
        pendingReconciliation: d.pendingReconciliation ?? 0,
        pendingTransactions: d.pendingTransactions ?? 0,
      });

      // Cập nhật biểu đồ doanh thu thuần thực tế
      setChart(Array.isArray(d.chart) ? d.chart : []);

      // Cập nhật bảng đối soát kênh thanh toán thực tế
      setPaymentChannels(Array.isArray(d.paymentChannels) ? d.paymentChannels : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối cơ sở dữ liệu");
      // Khi API lỗi: xóa sạch dữ liệu, không giữ mock data cũ
      setKpis(null);
      setChart(null);
      setPaymentChannels(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchFinanceData(appliedPeriod.from, appliedPeriod.to);
  }, [appliedPeriod, fetchFinanceData]);

  const handleApplyFilter = () => {
    if (dateFrom && dateTo && dateFrom <= dateTo) {
      const [y1, m1, d1] = dateFrom.split("-");
      const [y2, m2, d2] = dateTo.split("-");
      const label = `${d1}/${m1}/${y1} – ${d2}/${m2}/${y2}`;
      setAppliedPeriod({ from: dateFrom, to: dateTo, label });
      setIsCustomRangeOpen(false);
    }
  };

  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      downloadExcelCsv({
        filename: `Bao_cao_tai_chinh_${appliedPeriod.from}_${appliedPeriod.to}`,
        title: "BÁO CÁO TÀI CHÍNH",
        period: appliedPeriod.label,
        sections: [
          {
            title: "1. Tổng quan tài chính (KPI)",
            headers: ["Chỉ số", "Giá trị", "Đơn vị"],
            rows: [
              ["Doanh thu gộp (Gross)", (kpis?.grossRevenue ?? 0).toLocaleString("vi-VN"), "VNĐ"],
              ["Số đơn hàng trong kỳ", (kpis?.grossOrders ?? 0).toLocaleString("vi-VN"), "Đơn"],
              ["Hoàn tiền & Hủy", (kpis?.refunds ?? 0).toLocaleString("vi-VN"), "VNĐ"],
              ["Số giao dịch hoàn", (kpis?.refundTransactions ?? 0).toLocaleString("vi-VN"), "Giao dịch"],
              ["Doanh thu thuần (Net)", (kpis?.netRevenue ?? 0).toLocaleString("vi-VN"), "VNĐ"],
              ["Chờ đối soát", (kpis?.pendingReconciliation ?? 0).toLocaleString("vi-VN"), "VNĐ"],
              ["Giao dịch chờ đối soát", (kpis?.pendingTransactions ?? 0).toLocaleString("vi-VN"), "Giao dịch"],
            ],
          },
          {
            title: "2. Đối soát kênh thanh toán",
            headers: ["Mã kênh", "Tên kênh", "Chi tiết", "Thu (VNĐ)", "Hoàn (VNĐ)", "Thuần (VNĐ)", "Số GD", "Trạng thái"],
            rows: (paymentChannels ?? []).map((ch) => [
              ch.channel,
              ch.channelName,
              ch.detailTitle,
              ch.income.toLocaleString("vi-VN"),
              ch.refund.toLocaleString("vi-VN"),
              ch.net.toLocaleString("vi-VN"),
              ch.transactions,
              ch.status,
            ]),
          },
          {
            title: "3. Doanh thu thuần lũy kế theo ngày",
            headers: ["Ngày", "Doanh thu lũy kế (triệu đồng)"],
            rows: (chart ?? []).map((row) => [row.label, row.value]),
          },
        ],
      });
    } finally {
      setTimeout(() => setIsExporting(false), 300);
    }
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Bộ lọc khoảng thời gian */}
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
                <label htmlFor="finance-from-date" className="block text-xs text-muted mb-1">
                  Từ ngày
                </label>
                <input
                  id="finance-from-date"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`w-full ${control}`}
                />
              </div>
              <div>
                <label htmlFor="finance-to-date" className="block text-xs text-muted mb-1">
                  Đến ngày
                </label>
                <input
                  id="finance-to-date"
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
        aria-label="Xuất file Excel báo cáo tài chính"
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
        breadcrumbs={["Báo cáo", "Báo cáo tài chính"]}
        title="Báo cáo tài chính"
        subtitle="Theo dõi doanh thu, hoàn tiền và đối soát thanh toán từ cơ sở dữ liệu."
        actions={actions}
      />

      <ReportsNav period={appliedPeriod} />

      {/* Hiển thị thông báo lỗi và nút thử tải lại khi API thất bại */}
      {error && !loading && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-danger">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Chưa thể tải báo cáo tài chính</h3>
              <p className="mt-1 text-sm text-muted">{error}</p>
              <button
                type="button"
                onClick={() => fetchFinanceData(appliedPeriod.from, appliedPeriod.to)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Thử tải lại</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trạng thái Loading ban đầu */}
      {loading && !kpis && (
        <section aria-label="Đang tải chỉ số tài chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-line bg-surface p-6 h-36">
              <div className="h-4 w-24 bg-canvas rounded mb-3" />
              <div className="h-8 w-36 bg-canvas rounded mb-3" />
              <div className="h-3 w-28 bg-canvas rounded" />
            </div>
          ))}
        </section>
      )}

      {/* 4 KPI cards lấy 100% dữ liệu từ MongoDB */}
      {kpis && (
        <section aria-label="Chỉ số tài chính chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Doanh thu gộp"
            value={vnd(kpis.grossRevenue)}
            detail={`${kpis.grossOrders} đơn trong kỳ`}
          />
          <KpiCard
            label="Hoàn tiền"
            value={vnd(kpis.refunds)}
            detail={`${kpis.refundTransactions} giao dịch hoàn tiền`}
          />
          <KpiCard
            label="Doanh thu thuần"
            value={vnd(kpis.netRevenue)}
            detail="Đã trừ hoàn tiền"
          />
          <KpiCard
            label="Chờ đối soát"
            value={vnd(kpis.pendingReconciliation)}
            detail={`${kpis.pendingTransactions} giao dịch`}
            tone="warning"
          />
        </section>
      )}

      {/* Biểu đồ doanh thu thuần trong kỳ từ dữ liệu MongoDB */}
      {chart && chart.length > 0 ? (
        <LineChart
          title="Doanh thu thuần trong kỳ"
          subtitle="Đơn vị: triệu đồng · Lũy kế"
          data={chart}
          unit="triệu đồng"
        />
      ) : (
        !loading &&
        !error && (
          <section className="rounded-lg border border-line bg-surface p-6">
            <h2 className="text-xl font-semibold">Doanh thu thuần trong kỳ</h2>
            <p className="mt-4 text-sm text-muted">
              Chưa có dữ liệu giao dịch trong khoảng thời gian đã chọn để vẽ biểu đồ lũy kế.
            </p>
          </section>
        )
      )}

      {/* Bảng đối soát thanh toán theo kênh thực tế từ MongoDB */}
      {paymentChannels && (
        <DataTable
          caption="Đối soát thanh toán theo kênh"
          head={
            <>
              <Th className="w-44">Kênh thanh toán</Th>
              <Th>Chi tiết đối soát</Th>
              <Th className="w-40">Thuần (VND)</Th>
              <Th className="w-36">Trạng thái</Th>
              <Th className="w-32">Thao tác</Th>
            </>
          }
          footer={
            <Pagination
              from={paymentChannels.length > 0 ? 1 : 0}
              to={paymentChannels.length}
              total={paymentChannels.length}
            />
          }
        >
          {paymentChannels.length > 0 ? (
            paymentChannels.map((row) => (
              <tr key={row.id} className="hover:bg-canvas/50">
                <Td>
                  <Stack primary={row.channel} secondary={row.channelName} strong />
                </Td>
                <Td>
                  <div className="min-w-0">
                    <p className="font-semibold">{row.detailTitle}</p>
                    <p className="mt-1 text-xs text-muted">
                      Thu {vnd(row.income)} · Hoàn {vnd(row.refund)} · {row.transactions} giao dịch
                    </p>
                  </div>
                </Td>
                <Td className="font-semibold tabular-nums">{vnd(row.net)}</Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td>
                  <ActionLink href={`/admin/reports/finance?channel=${row.id}`}>Chi tiết</ActionLink>
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={5} className="text-center text-muted py-8">
                Không có dữ liệu đối soát thanh toán trong khoảng thời gian này.
              </Td>
            </tr>
          )}
        </DataTable>
      )}
    </div>
  );
}
