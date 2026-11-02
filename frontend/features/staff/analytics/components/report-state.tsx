import { ListState, secondaryButton } from "@/components/workspace/workspace-ui";

export function ReportLoading() {
  return <div aria-busy="true"><ListState kind="loading" title="Đang tải báo cáo…" columns={4} rows={3} /></div>;
}
export function ReportError({ error, retry }: { error: Error; retry: () => void }) {
  return <ListState kind="error" title="Chưa thể tải báo cáo" description={error.message}
    action={<button type="button" className={secondaryButton} onClick={retry}>Thử lại</button>} />;
}
export function ReportRefresh({ at, refresh }: { at?: string; refresh: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
    <span>{at ? `Cập nhật ${new Date(at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · UTC+07` : "Dữ liệu từ hệ thống"}</span>
    <button type="button" className={secondaryButton} onClick={refresh}>Tải lại dữ liệu</button>
  </div>;
}
