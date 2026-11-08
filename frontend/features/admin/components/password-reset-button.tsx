"use client";

import { secondaryButton } from "@/components/workspace/workspace-ui";
import type { usePasswordReset } from "../hooks/use-password-reset";

type Reset = ReturnType<typeof usePasswordReset>;

/** Sends, or sends again, the password email; the result is announced below the button. */
export function PasswordResetButton({ reset, label = "Gửi đặt lại mật khẩu", disabledReason }: { reset: Reset; label?: string; disabledReason?: string }) {
  const sending = reset.state === "sending";
  return <div className="flex flex-col gap-2">
    <button type="button" className={`${secondaryButton} min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-60`}
      disabled={sending || Boolean(disabledReason)} onClick={() => void reset.send()}>
      {sending ? "Đang gửi…" : reset.state === "sent" || reset.state === "failed" ? "Gửi lại" : label}
    </button>
    {disabledReason && <p className="text-xs text-muted">{disabledReason}</p>}
    {reset.message && <p role={reset.state === "failed" ? "alert" : "status"} className={`text-xs ${reset.state === "failed" ? "text-danger" : "text-brand"}`}>{reset.message}</p>}
  </div>;
}
