"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { validateRegister } from "../validation";
import { useAuthForm } from "../use-auth-form";
import { AuthFeedback } from "./auth-feedback";
import { ProfileFields, TermsCheckbox } from "./profile-fields";
import { registerWithEmail } from "../auth-actions";
import { useAuth } from "../auth-provider";

export function RegisterForm() {
  const router = useRouter();
  const { acceptUser } = useAuth();
  const { errors, notice, failure, pending, onSubmit, onChange } = useAuthForm(validateRegister, async (data) => {
    const user = await registerWithEmail(String(data.get("email") || "").trim(), String(data.get("password") || ""), {
      fullName: String(data.get("fullName") || "").trim(), phone: String(data.get("phone") || "").trim(),
      terms: data.get("terms") === "on",
    });
    acceptUser(user); router.replace("/");
  });

  return (
    <>
      <form method="post" noValidate onSubmit={onSubmit} onChange={onChange} aria-busy={pending} aria-label="Đăng ký tài khoản">
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-4">
        <ProfileFields prefix="register" errors={errors} />
        <TextField id="register-email" name="email" label="Email" type="email" placeholder="Nhập địa chỉ email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required error={errors.email} />
        <TextField
          id="register-password"
          name="password"
          label="Mật khẩu"
          type="password"
          placeholder="Tạo mật khẩu"
          autoComplete="new-password"
          aria-describedby="register-password-guidance"
          required
          error={errors.password}
        />
        <p id="register-password-guidance" className="text-xs text-muted">Ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.</p>
        <TextField
          id="register-confirm-password"
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
        />
        <TermsCheckbox id="register-terms" error={errors.terms} />
        <Button type="submit" className="w-full">{pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}</Button>
        <AuthFeedback notice={notice} failure={failure} />
        </fieldset>
      </form>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản? <Link href="/login" className="ml-1 font-semibold text-brand hover:underline">Đăng nhập</Link>
      </p>
    </>
  );
}
