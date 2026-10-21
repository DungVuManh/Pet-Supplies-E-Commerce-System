import { Suspense, type ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main className="p-8" aria-busy="true"><p role="status">Đang kiểm tra quyền truy cập…</p></main>}>
    {children}
  </Suspense>;
}
