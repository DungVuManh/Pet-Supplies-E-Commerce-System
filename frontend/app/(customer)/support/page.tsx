import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SupportView } from "@/features/support";

export const metadata: Metadata = {
  title: "Hỗ trợ & Liên hệ khách hàng | Petjoy",
  description:
    "Trung tâm hỗ trợ và chăm sóc khách hàng Petjoy. Luôn sẵn sàng giải đáp mọi thắc mắc của bạn và thú cưng.",
};

export default function SupportPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-8 outline-none sm:px-6 xl:px-16"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-brand hover:underline transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-ink">Hỗ trợ & Liên hệ</span>
      </nav>

      {/* Nội dung trang Hỗ trợ */}
      <SupportView />
    </main>
  );
}

