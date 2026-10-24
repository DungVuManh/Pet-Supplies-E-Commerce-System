"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";


export default function AccountLayout({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "ready" && !user) {
      router.replace("/login?redirect=/account/profile");
    }
  }, [status, user, router]);

  if (status === "loading") {
    return (
      <main className="flex-1 bg-canvas py-16">
        <div className="mx-auto max-w-[1440px] px-6 text-center text-muted">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand border-r-transparent" />
          <p className="mt-4 text-sm font-semibold">Đang kiểm tra tài khoản…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
