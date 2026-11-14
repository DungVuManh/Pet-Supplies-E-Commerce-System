import { Suspense } from "react";
import { AuditLogDetailView } from "@/features/admin/components/audit-log-detail-view";
import { getAuditLog } from "@/features/admin/services/audit-log.server";

type Params = Promise<{ id: string }>;

async function AuditLogDetail({ params }: { params: Params }) {
  const { id } = await params;
  const log = await getAuditLog(id);
  return <AuditLogDetailView log={log} />;
}

export const metadata = {
  title: "Chi tiết nhật ký hệ thống",
};

export default function AdminAuditLogDetailPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p role="status" className="p-6 text-muted">Đang tải chi tiết nhật ký…</p>}>
      <AuditLogDetail params={params} />
    </Suspense>
  );
}
