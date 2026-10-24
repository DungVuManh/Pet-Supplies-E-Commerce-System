"use client";

import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { AdminPageHeader, DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";
import { SystemNav } from "./system-nav";
import { auditLogEntries, filterAuditLog } from "../mock/system";
import { ActionLink, InfoCallout, Pagination, card, control, secondaryButton } from "@/features/workspace/components/workspace-ui";
import { DemoNotice } from "@/features/workspace/components/demo-notice";

const ACTIONS = [
  "Tất cả hành động",
  "Cập nhật tồn kho",
  "Khóa tài khoản",
  "Duyệt yêu cầu hủy",
  "Công bố chính sách",
  "Xóa sản phẩm",
  "Cập nhật cấu hình",
];

const PERIOD = "01–12/10/2026";

export function AuditLogView() {
  const [searchInput, setSearchInput] = useState("");
  const [actionInput, setActionInput] = useState("Tất cả hành động");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedAction, setAppliedAction] = useState("Tất cả hành động");

  const handleApplyFilter = () => {
    setAppliedSearch(searchInput);
    setAppliedAction(actionInput);
  };

  const filteredEntries = useMemo(() => {
    return filterAuditLog(auditLogEntries, {
      search: appliedSearch,
      action: appliedAction,
    });
  }, [appliedSearch, appliedAction]);

  const actions = (
    <DemoNotice
      label="Xuất nhật ký"
      icon={<Download className="h-4 w-4" aria-hidden="true" />}
      message="Chức năng xuất nhật ký hệ thống chưa kết nối backend."
    />
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Hệ thống", "Nhật ký hệ thống"]}
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
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="audit-period" className="font-medium">
              Khoảng thời gian
            </label>
            <select id="audit-period" defaultValue={PERIOD} className={control}>
              <option value={PERIOD}>{PERIOD}</option>
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

      {/* Populated Table */}
      <DataTable
        caption="Nhật ký hoạt động hệ thống chi tiết"
        head={
          <>
            <Th className="w-44">Thời gian</Th>
            <Th>Người thực hiện / Hành động</Th>
            <Th className="w-36">Đối tượng</Th>
            <Th className="w-36">Kết quả</Th>
            <Th className="w-32">Thao tác</Th>
          </>
        }
        footer={
          <Pagination
            from={1}
            to={filteredEntries.length}
            total={1842}
          />
        }
      >
        {filteredEntries.map((row) => (
          <tr key={row.id} className="hover:bg-canvas/50">
            <Td>
              <Stack primary={row.time} secondary={row.fullTime} strong />
            </Td>
            <Td>
              <div className="min-w-0">
                <p className="font-semibold">{row.actor}</p>
                <p className="mt-1 text-xs text-muted">
                  {row.action}: {row.detail} · IP {row.ip}
                </p>
              </div>
            </Td>
            <Td className="font-mono text-sm font-semibold">{row.target}</Td>
            <Td>
              <StatusBadge status={row.result} />
            </Td>
            <Td>
              <ActionLink href={`/admin/system/audit-log?id=${row.id}`}>Chi tiết</ActionLink>
            </Td>
          </tr>
        ))}
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
