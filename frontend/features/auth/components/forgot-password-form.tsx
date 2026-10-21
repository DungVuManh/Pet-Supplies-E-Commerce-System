"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { sendPasswordReset } from "../auth-actions";
import { useAuthForm } from "../use-auth-form";
import { validateResetEmail } from "../validation";
import { AuthFeedback } from "./auth-feedback";

export function ForgotPasswordForm() {
  const { errors, notice, failure, pending, onSubmit, onChange } = useAuthForm(validateResetEmail, async (data) => {
    await sendPasswordReset(String(data.get("email") || "").trim());
    return "Nếu email này có tài khoản, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Hãy kiểm tra cả thư rác.";
  });
  return <>
    <form noValidate onSubmit={onSubmit} onChange={onChange} aria-label="Khôi phục mật khẩu" aria-busy={pending}>
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
        <TextField id="reset-email" name="email" type="email" label="Email" placeholder="Nhập email đã đăng ký"
          autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required error={errors.email} />
        <Button type="submit">{pending ? "Đang gửi…" : "Gửi hướng dẫn khôi phục"}</Button>
        <AuthFeedback notice={notice} failure={failure} />
      </fieldset>
    </form>
    <Link href="/login" className="text-center text-sm font-semibold text-brand hover:underline">Quay lại đăng nhập</Link>
  </>;
}
