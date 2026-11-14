"use client";

import { useMemo, useState } from "react";
import { CircleX, Download, ShieldCheck } from "lucide-react";
import { AdminPageHeader, DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";
import { SystemNav } from "./system-nav";
import { ActionLink, Field, InfoCallout, ListState, Pagination, card, control, secondaryButton } from "@/components/workspace/workspace-ui";
import { useAuditLogList } from "../hooks/use-audit-log-list";
import type { AuditLogFilter } from "../types";

const ACTIONS = [
  { value: "all", label: "Tất cả hành động" },
  { value: "order.create.offline", label: "Nhân viên tạo đơn hàng offline" },
  { value: "cập nhật tồn kho", label: "Cập nhật tồn kho" },
  { value: "user.lock", label: "Khóa tài khoản" },
  { value: "user.unlock", label: "Mở khóa tài khoản" },
  { value: "admin.cancellation.approve", label: "Duyệt yêu cầu hủy" },
  { value: "admin.cancellation.reject", label: "Từ chối yêu cầu hủy" },
  { value: "policies.update", label: "Công bố chính sách" },
  { value: "product.delete", label: "Xóa sản phẩm" },
  { value: "settings.update", label: "Cập nhật cấu hình" },
  { value: "product.update", label: "Cập nhật sản phẩm" },
  { value: "product.create", label: "Tạo sản phẩm" },
  { value: "product.hide", label: "Ẩn sản phẩm" },
  { value: "product.show", label: "Hiện sản phẩm" },
  { value: "category.create", label: "Tạo danh mục" },
  { value: "category.update", label: "Cập nhật danh mục" },
  { value: "category.delete", label: "Xóa danh mục" },
  { value: "user.create", label: "Tạo người dùng" },
  { value: "user.update", label: "Cập nhật người dùng" },
  { value: "voucher.create", label: "Tạo mã giảm giá" },
  { value: "voucher.update", label: "Cập nhật mã giảm giá" },
  { value: "voucher.delete", label: "Xóa mã giảm giá" },
  { value: "masterData.create", label: "Tạo dữ liệu danh mục" },
  { value: "order.export", label: "Xuất danh sách đơn hàng" },
  { value: "product.export", label: "Xuất danh sách sản phẩm" },
  { value: "admin.access", label: "Từ chối truy cập quản trị" },
];

const PERIOD_OPTIONS = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "today", label: "Hôm nay" },
  { value: "7days", label: "7 ngày qua" },
  { value: "30days", label: "30 ngày qua" },
  { value: "this-month", label: "Tháng này" },
  { value: "last-month", label: "Tháng trước" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  customer: "Khách hàng",
  system: "Hệ thống",
};

function targetActionText(row: { targetCollection?: string; actionCode?: string }) {
  const col = (row.targetCollection || "").toLowerCase();
  const code = (row.actionCode || "").toLowerCase();
  if (col === "users" || code.startsWith("user.")) return "Xem tài khoản →";
  if (col === "orders" || code.startsWith("order.") || code.includes("cancellation")) return "Xem đơn hàng →";
  if (col === "products" || code.startsWith("product.")) return "Xem sản phẩm →";
  if (col === "settings" || code.startsWith("setting")) return "Xem cấu hình →";
  if (col === "categories" || code.startsWith("category.")) return "Xem danh mục →";
  if (col === "vouchers" || code.startsWith("voucher.")) return "Xem voucher →";
  if (col === "policies" || code.startsWith("polic")) return "Xem chính sách →";
  if (col === "masterdata" || code.startsWith("masterdata.")) return "Xem thuộc tính →";
  return "Xem đối tượng →";
}

function formatIsoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function calculateDatesForPeriod(period: string): { from?: string; to?: string } {
  const now = new Date();
  if (period === "today") {
    const todayStr = formatIsoDate(now);
    return { from: todayStr, to: todayStr };
  }
  if (period === "7days") {
    const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: formatIsoDate(past), to: formatIsoDate(now) };
  }
  if (period === "30days") {
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: formatIsoDate(past), to: formatIsoDate(now) };
  }
  if (period === "this-month") {
    const pad = (n: number) => String(n).padStart(2, "0");
    const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    return { from: firstDay, to: formatIsoDate(now) };
  }
  if (period === "last-month") {
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    return {
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${pad(lastDayOfMonth)}`,
    };
  }
  return {};
}

export function AuditLogView() {
  const { apply, reset, setPage, reload, items, pagination, from, to, state } = useAuditLogList();

  const [searchInput, setSearchInput] = useState("");
  const [actionInput, setActionInput] = useState("all");
  const [periodInput, setPeriodInput] = useState("all");

  const handleApplyFilter = () => {
    const { from: fromDate, to: toDate } = calculateDatesForPeriod(periodInput);
    const next: AuditLogFilter = {
      q: searchInput.trim(),
      action: actionInput,
      from: fromDate,
      to: toDate,
    };
    apply(next);
  };

  const handleReset = () => {
    setSearchInput("");
    setActionInput("all");
    setPeriodInput("all");
    reset();
  };

  const handleExportCsv = () => {
    if (!items.length) {
      alert("Không có bản ghi nhật ký nào để xuất.");
      return;
    }

    const headers = [
      "Mã bản ghi",
      "Thời gian",
      "Người thực hiện",
      "Vai trò",
      "Hành động",
      "Chi tiết nội dung",
      "Đối tượng tác động",
      "Kết quả",
      "Địa chỉ IP",
    ];

    const escapeCsv = (val: string | null | undefined) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = items.map((r) => [
      r.id,
      r.fullTime,
      r.actor,
      ROLE_LABELS[r.actorRole] || r.actorRole,
      r.action,
      r.detail,
      r.target,
      r.result,
      r.ip,
    ]);

    const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nhat-ky-he-thong-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const actions = (
    <button
      type="button"
      onClick={handleExportCsv}
      className={`${secondaryButton} h-12 flex items-center gap-1.5`}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      <span>Xuất nhật ký</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Quản trị", "Hệ thống", "Nhật ký hệ thống"]}
        title="Nhật ký hệ thống"
        subtitle="Theo dõi ai đã thay đổi dữ liệu, khi nào và nội dung thay đổi."
        actions={actions}
      />

      <SystemNav />

      {/* Filter Section */}
      <section className={`${card} p-6`}>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_180px_auto]">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="audit-search" className="font-medium">
              Tìm kiếm
            </label>
            <input
              id="audit-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
              placeholder="Người thực hiện hoặc mã bản ghi"
              className={control}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="audit-action" className="font-medium">
              Hành động
            </label>
            <select
              id="audit-action"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              className={control}
            >
              {ACTIONS.map((act) => (
                <option key={act.value} value={act.value}>
                  {act.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="audit-period" className="font-medium">
              Khoảng thời gian
            </label>
            <select
              id="audit-period"
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
              className={control}
            >
              {PERIOD_OPTIONS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
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

      {/* Table Section */}
      <DataTable
        caption="Nhật ký hoạt động hệ thống chi tiết"
        head={
          <>
            <Th className="w-44">Thời gian</Th>
            <Th>Người thực hiện</Th>
            <Th className="w-64">Hành động</Th>
            <Th className="w-36">Kết quả</Th>
          </>
        }
        footer={
          state ? undefined : (
            <Pagination
              from={from}
              to={to}
              total={pagination.total}
              page={pagination.page}
              pages={pagination.totalPages}
              onPage={setPage}
            />
          )
        }
      >
        {state ? (
          <tr>
            <td colSpan={5} className="border-t border-line px-6">
              {state === "loading" && (
                <ListState kind="loading" title="Đang tải nhật ký hệ thống..." />
              )}
              {state === "empty" && (
                <ListState
                  kind="empty"
                  title="Không tìm thấy bản ghi"
                  description="Không có bản ghi nhật ký khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc."
                  action={
                    <button
                      type="button"
                      className={`${secondaryButton} min-h-10`}
                      onClick={handleReset}
                    >
                      Xóa bộ lọc
                    </button>
                  }
                />
              )}
              {state === "error" && (
                <ListState
                  kind="error"
                  icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />}
                  title="Không thể tải nhật ký hệ thống"
                  description="Kết nối đến hệ thống bị gián đoạn. Kiểm tra kết nối và thử tải lại."
                  action={
                    <button
                      type="button"
                      className={`${secondaryButton} min-h-10`}
                      onClick={reload}
                    >
                      Thử lại
                    </button>
                  }
                />
              )}
            </td>
          </tr>
        ) : (
          items.map((row) => (
            <tr key={row.id} className="hover:bg-canvas/50">
              <Td>
                <Stack primary={row.time} secondary={row.fullTime} strong />
              </Td>
              <Td>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {row.actor}
                    {row.actorRole && row.actorRole !== "system" && (
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        ({ROLE_LABELS[row.actorRole] ?? row.actorRole})
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {row.detail && row.detail !== row.action ? `${row.detail} · ` : ""}
                  </p>
                </div>
              </Td>
              <Td>
                <span className="font-semibold">{row.action}</span>
              </Td>
              <Td>
                <StatusBadge status={row.result} />
              </Td>
            </tr>
          ))
        )}
      </DataTable>

      {/* Nhật ký chỉ đọc callout */}
      <InfoCallout
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        title="Nhật ký chỉ đọc"
      >
        Dữ liệu được lưu trong 365 ngày để phục vụ kiểm tra và bảo mật. Không thể chỉnh sửa hoặc xóa các bản ghi.
      </InfoCallout>
    </div>
  );
}
