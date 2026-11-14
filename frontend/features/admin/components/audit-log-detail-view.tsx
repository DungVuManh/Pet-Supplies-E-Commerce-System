"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { DetailList, InfoCallout, card, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { AdminPageHeader, StatusBadge } from "./admin-ui";
import type { AdminAuditLogRow } from "../types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên (Admin)",
  staff: "Nhân viên (Staff)",
  customer: "Khách hàng (Customer)",
  system: "Hệ thống (System)",
};

export function AuditLogDetailView({ log }: { log: AdminAuditLogRow }) {
  const details = [
    { label: "Mã bản ghi", value: <span className="font-mono text-xs">{log.id}</span> },
    { label: "Thời gian", value: log.fullTime },
    {
      label: "Người thực hiện",
      value: (
        <span>
          {log.actor}{" "}
          <span className="text-xs font-normal text-muted">
            ({ROLE_LABELS[log.actorRole] ?? log.actorRole})
          </span>
        </span>
      ),
    },
    ...(log.actorEmail ? [{ label: "Email tài khoản", value: log.actorEmail }] : []),
    ...(log.actorPhone ? [{ label: "Số điện thoại", value: log.actorPhone }] : []),
    {
      label: "Hành động",
      value: (
        <span>
          {log.action}{" "}
          <span className="font-mono text-xs text-muted">({log.actionCode})</span>
        </span>
      ),
    },
    { label: "Địa chỉ IP", value: log.ip },
    {
      label: "Đối tượng tác động",
      value: log.targetHref ? (
        <Link
          href={log.targetHref}
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
        >
          <span>{log.target}</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : (
        log.target
      ),
    },
    { label: "Loại đối tượng", value: log.targetCollection || "—" },
    { label: "Kết quả", value: <StatusBadge status={log.result} /> },
  ];

  const hasSnapshots = Boolean(log.before || log.after);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Quản trị", "Hệ thống", "Nhật ký hệ thống", `Bản ghi #${log.id.slice(-6).toUpperCase()}`]}
        title="Chi tiết nhật ký hệ thống"
        subtitle={`Theo dõi thông tin chi tiết thay đổi dữ liệu của bản ghi #${log.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/system/audit-log"
              className={`${secondaryButton} h-12 flex items-center gap-1.5`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Quay lại danh sách</span>
            </Link>
            {log.targetHref && (
              <Link
                href={log.targetHref}
                className={`${primaryLink} h-12 flex items-center gap-1.5 px-6`}
              >
                <span>Xem đối tượng</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        }
      />

      {/* Main Details Grid */}
      <div className="grid gap-6 lg:grid-cols-[480px_minmax(0,1fr)]">
        {/* Left: General Info Card */}
        <section aria-labelledby="audit-info-heading" className={`${card} p-6`}>
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <h2 id="audit-info-heading" className="text-xl font-semibold">
              Thông tin bản ghi
            </h2>
            <StatusBadge status={log.result} />
          </div>

          <div className="mt-4">
            <DetailList items={details} />
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Nội dung mô tả tóm tắt
            </p>
            <p className="mt-2 text-sm leading-relaxed">{log.summary || log.detail || "Không có tóm tắt chi tiết."}</p>
          </div>
        </section>

        {/* Right: Snapshots Before/After */}
        <div className="space-y-6">
          <section aria-labelledby="snapshots-heading" className={`${card} p-6`}>
            <h2 id="snapshots-heading" className="text-xl font-semibold">
              Dữ liệu thay đổi (Snapshots)
            </h2>
            <p className="mt-1 text-xs text-muted">
              Bản sao dữ liệu trước và sau khi thực hiện thao tác (đã loại bỏ thông tin nhạy cảm).
            </p>

            {hasSnapshots ? (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Trước khi thay đổi (Before)</span>
                    <span className="text-xs font-mono text-muted">
                      {log.before ? "Dữ liệu gốc" : "Không có"}
                    </span>
                  </div>
                  <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg border border-line bg-canvas p-4 text-xs font-mono leading-relaxed text-fg shadow-inner">
                    {log.before ? JSON.stringify(log.before, null, 2) : "// Không có dữ liệu trước thay đổi"}
                  </pre>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Sau khi thay đổi (After)</span>
                    <span className="text-xs font-mono text-brand">
                      {log.after ? "Dữ liệu mới" : "Không có"}
                    </span>
                  </div>
                  <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg border border-line bg-canvas p-4 text-xs font-mono leading-relaxed text-fg shadow-inner">
                    {log.after ? JSON.stringify(log.after, null, 2) : "// Không có dữ liệu sau thay đổi"}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
                Bản ghi này không lưu snapshot thay đổi trường dữ liệu.
              </div>
            )}
          </section>

          <InfoCallout
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            title="Nhật ký kiểm toán an toàn"
          >
            Nhật ký hệ thống được ghi nhận tự động ở tầng bảo mật máy chủ, chống sửa đổi và bảo lưu toàn vẹn thông tin truy vết.
          </InfoCallout>
        </div>
      </div>
    </div>
  );
}
