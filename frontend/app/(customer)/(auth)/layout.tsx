import type { ReactNode } from "react";
import { AuthWelcome } from "@/features/auth/components/auth-welcome";
import { GuestGuard } from "@/features/auth/components/guest-guard";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestGuard>
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center px-4 py-8 outline-none sm:px-6">
        <div className="mx-auto grid w-full max-w-[536px] items-center gap-12 lg:max-w-6xl lg:grid-cols-2 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:gap-24">
          <AuthWelcome />
          {children}
        </div>
      </main>
    </GuestGuard>
  );
}
