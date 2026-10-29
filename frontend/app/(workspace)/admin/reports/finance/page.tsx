import { Download } from "lucide-react";
import { AdminPageHeader, DataTable, KpiCard, PeriodChip, StatusBadge, Stack, Td, Th } from "@/features/admin/components/admin-ui";
import { ReportsNav } from "@/features/admin/components/reports-nav";
import { cumulativeRevenue } from "@/features/admin/mock/overview";
import { financeKpis, paymentChannels, reportPeriod } from "@/features/admin/mock/reports";
import { ActionLink, LineChart, Pagination } from "@/components/workspace/workspace-ui";
import { DemoNotice } from "@/components/workspace/demo-notice";

export const metadata = {
  title: "Báo cáo tài chính",
};

const vnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

export default function AdminFinanceReportPage() {
  const actions = (
    <>
      <PeriodChip period={reportPeriod} />
      <DemoNotice
        label="Xuất Excel"
        icon={<Download className="h-4 w-4" aria-hidden="true" />}
        message="Chức năng xuất báo cáo tài chính chưa kết nối backend."
      />
    </>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Báo cáo", "Báo cáo tài chính"]}
        title="Báo cáo tài chính"
        subtitle="Theo dõi doanh thu, hoàn tiền và đối soát thanh toán."
        actions={actions}
      />

      <ReportsNav />

      {/* 4 KPI cards */}
      <section aria-label="Chỉ số tài chính chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Doanh thu gộp"
          value={vnd(financeKpis.grossRevenue)}
          detail={`${financeKpis.grossOrders} đơn trong kỳ`}
        />
        <KpiCard
          label="Hoàn tiền"
          value={vnd(financeKpis.refunds)}
          detail={`${financeKpis.refundTransactions} giao dịch hoàn tiền`}
        />
        <KpiCard
          label="Doanh thu thuần"
          value={vnd(financeKpis.netRevenue)}
          detail="Đã trừ hoàn tiền"
        />
        <KpiCard
          label="Chờ đối soát"
          value={vnd(financeKpis.pendingReconciliation)}
          detail={`${financeKpis.pendingTransactions} giao dịch`}
          tone="warning"
        />
      </section>

      {/* Net revenue line chart */}
      <LineChart
        title="Doanh thu thuần trong kỳ"
        subtitle="Đơn vị: triệu đồng · Lũy kế"
        data={cumulativeRevenue}
        unit="triệu đồng"
      />

      {/* Payment-channel table */}
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
        footer={<Pagination from={1} to={paymentChannels.length} total={paymentChannels.length} />}
      >
        {paymentChannels.map((row) => (
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
        ))}
      </DataTable>
    </div>
  );
}
