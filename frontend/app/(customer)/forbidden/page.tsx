import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export const metadata = { title: "Không có quyền truy cập" };

export default function ForbiddenPage() {
  return <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-16">
    <p className="font-semibold text-muted">403 · Không có quyền truy cập</p>
    <h1 className="text-[32px] font-semibold tracking-[-0.8px]">Bạn không có quyền truy cập chức năng này.</h1>
    <p className="leading-relaxed text-muted">Hãy về trang chủ hoặc sử dụng tài khoản có vai trò phù hợp.</p>
    <Link href="/" className={buttonClassName}>Về trang chủ</Link>
  </main>;
}
