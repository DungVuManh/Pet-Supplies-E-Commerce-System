"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ retry }: { retry: () => void }) {
  return <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-16">
    <h1 className="text-[32px] font-semibold tracking-[-0.8px]">Chưa thể mở dashboard</h1>
    <p role="alert" className="leading-relaxed text-muted">Chưa thể kiểm tra quyền truy cập. Vui lòng thử lại sau.</p>
    <div className="flex flex-wrap items-center gap-6">
      <Button onClick={retry}>Thử lại</Button>
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">Về trang chủ</Link>
    </div>
  </main>;
}
