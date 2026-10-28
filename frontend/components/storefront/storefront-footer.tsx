import { Logo } from "@/components/ui/logo";

export function StorefrontFooter() {
  return (
    <footer className="shrink-0 border-t border-line bg-surface text-xs text-muted">
      <div className="mx-auto flex min-h-14 max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-5 text-center md:flex-row md:py-4 md:text-left xl:px-16">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
          <Logo href="/" size="sm" />
          <p>© 2026 Petjoy. Chăm sóc trọn vẹn, yêu thương mỗi ngày.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <span>Chính sách giao hàng</span><span aria-hidden="true">·</span>
          <span>Đổi trả &amp; hoàn tiền</span><span aria-hidden="true">·</span>
          <a href="tel:1900636789" className="hover:text-brand">Trợ giúp</a>
        </div>
      </div>
    </footer>
  );
}
