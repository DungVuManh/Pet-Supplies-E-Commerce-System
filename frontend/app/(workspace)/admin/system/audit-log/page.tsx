import { AuditLogView } from "@/features/admin/components/audit-log-view";

export const metadata = {
  title: "Nhật ký hệ thống",
};

export default function AdminAuditLogPage() {
  return <AuditLogView />;
}
