"use client";

// =============================================================
// app/(customer)/account/vouchers/page.tsx
// Trang Ví voucher nằm trong Khu vực Quản lý tài khoản
// =============================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { AccountShell } from "@/features/account/components/account-shell";
import { CustomerVouchersView } from "@/features/account/components/vouchers/customer-vouchers-view";

export default function AccountVouchersPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "ready" && !user) {
      router.replace("/login?redirect=/account/vouchers");
    }
  }, [status, user, router]);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16">
      <AccountShell activeTab="vouchers">
        <CustomerVouchersView />
      </AccountShell>
    </div>
  );
}

