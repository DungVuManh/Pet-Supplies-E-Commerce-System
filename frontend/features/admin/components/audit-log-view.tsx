"use client";

import { useState } from "react";
import { CircleX, Download, ShieldCheck } from "lucide-react";
import { AdminPageHeader, DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";
import { SystemNav } from "./system-nav";
import { ActionLink, Field, InfoCallout, ListState, Pagination, card, control, secondaryButton } from "@/components/workspace/workspace-ui";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { useAuditLogList } from "../hooks/use-audit-log-list";
import type { AuditLogFilter, AuditResult } from "../types";

const ACTION_OPTIONS = [
  { value: "all", label: "Tất cả hành động" },
  { value: "product.update", label: "Cập nhật tồn kho" },
  { value: "user.lock", label: "Khóa tài khoản" },
  { value: "user.unlock", label: "Mở khóa tài khoản" },
  { value: "policies.update", label: "Công bố chính sách" },
  { value: "product.delete", label: "Xóa sản phẩm" },
  { value: "product.create", label: "Tạo sản phẩm" },
  { value: "product.hide", label: "Ẩn sản phẩm" },
  { value: "settings.update", label: "Cập nhật cấu hình" },
  { value: "user.create", label: "Tạo người dùng" },
  { value: "user.update", label: "Cập nhật người dùng" },
  { value: "category.create", label: "Tạo danh mục" },
  { value: "category.update", label: "Cập nhật danh mục" },
  { value: "category.delete", label: "Xóa danh mục" },
  { value: "voucher.create", label: "Tạo mã giảm giá" },
  { value: "voucher.update", label: "Cập nhật mã giảm giá" },
  { value: "voucher.delete", label: "Xóa mã giảm giá" },
  { value: "admin.access", label: "Truy cập bị từ chối" },
];

const RESULT_OPTIONS: { value: AuditResult; label: string }[] = [
  { value: "all", label: "Tất cả kết quả" },
  { value: "success", label: "Thành công" },
  { value: "denied", label: "Bị từ chối" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  customer: "Khách hàng",
  system: "Hệ thống",
};

export function AuditLogView() {
  const { filter, draft, setDraft, apply, reset, setPage, reload, items, pagination, from, to, loading, state } = useAuditLogList();

  // Draft state for filter form (applied only on button click)
  const [draftAction, setDraftAction] = useState(draft.action);
  const [draftResult, setDraftResult] = useState<AuditResult>(draft.result);
  const [draftQ, setDraftQ] = useState(draft.q);

  function applyFilters() {
    const next: AuditLogFilter = { q: draftQ, action: draftAction, result: draftResult };
    apply(next);
  }

  function handleReset() {
    setDraftQ("");
    setDraftAction("all");
    setDraftResult("all");
    reset();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Hệ thống", "Nhật ký hệ thống"]}
        title="Nhật ký hệ thống"
        subtitle="Theo dõi ai đã thay đổi dữ liệu, khi nào và nội dung thay đổi."
      />

      <SystemNav />

      {/* Filter Section */}
      <section className={`${card} p-6`}>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_180px_180px_auto]">
          <Field label="Tìm kiếm" htmlFor="audit-search">
            <input
              id="audit-search"
              type="search"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Người thực hiện, IP hoặc mã bản ghi"
              className={control}
            />
          </Field>

          <Field label="Hành động" htmlFor="audit-action">
            <select
              id="audit-action"
              value={draftAction}
              onChange={(e) => setDraftAction(e.target.value)}
              className={control}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="button"
            onClick={applyFilters}
            className={`${secondaryButton} h-12`}
          >
            Lọc dữ liệu
          </button>
        </div>
      </section>

      {/* Audit Log Table */}
      {/* Audit Log Table */}
      <DataTable
        caption="Nhật ký hoạt động hệ thống chi tiết"
        head={
          <>
            <Th className="w-44">Thời gian</Th>
            <Th>Người thực hiện</Th>
            <Th className="w-48">Hành động</Th>
            <Th className="w-36">Kết quả</Th>
            <Th className="w-32">Thao tác</Th>
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
                  description="Không có bản ghi nhật ký khớp với bộ lọc. Thử thay đổi từ khóa hoặc xóa bộ lọc."
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
                </div>
              </Td>
              <Td className="font-semibold">{row.action}</Td>
              <Td>
                <StatusBadge status={row.result} />
              </Td>
              <Td>
                <ActionLink href={row.targetHref}>Chi tiết</ActionLink>
              </Td>
            </tr>
          ))
        )}
      </DataTable>
      {/* Read-only callout */}
      <InfoCallout
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        title="Nhật ký chỉ đọc"
      >
        Dữ liệu được lưu trong 365 ngày để phục vụ kiểm tra và bảo mật. Không thể chỉnh sửa hoặc xóa các bản ghi.
      </InfoCallout>
    </div>
  );
}
