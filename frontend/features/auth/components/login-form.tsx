"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/text-field";
import { validateLogin } from "../validation";
import { useAuthForm } from "../use-auth-form";
import { AuthFeedback } from "./auth-feedback";
import { CompleteProfileForm } from "./complete-profile-form";
import { AuthApiError } from "../api";
import { loginWithEmail, clearFirebaseIdentity } from "../auth-actions";
import { useAuth } from "../auth-provider";
import type { Customer } from "../types";

export function LoginForm() {
  const router = useRouter();
  const { acceptUser } = useAuth();
  const [needsProfile, setNeedsProfile] = useState(false);
  const [remember, setRemember] = useState(false);
  function finish(user: Customer) { acceptUser(user); router.replace("/"); }
  const { errors, notice, failure, pending, onSubmit, onChange } = useAuthForm(validateLogin, async (data) => {
    const rememberChoice = data.get("remember") === "on";
    setRemember(rememberChoice);
    try {
      finish(await loginWithEmail(String(data.get("identifier") || "").trim(), String(data.get("password") || ""), rememberChoice));
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "PROFILE_INCOMPLETE") { setNeedsProfile(true); return; }
      throw error;
    }
  });

  if (needsProfile) return <CompleteProfileForm remember={remember} onSuccess={finish} onCancel={async () => {
    await clearFirebaseIdentity(); setNeedsProfile(false);
  }} />;

  return (
    <>
      <form method="post" noValidate onSubmit={onSubmit} onChange={onChange} aria-busy={pending} aria-label="Đăng nhập">
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
        <TextField
          id="login-identifier"
          name="identifier"
          label="Email"
          type="email"
          placeholder="Nhập địa chỉ email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          required
          error={errors.identifier}
        />
        <TextField
          id="login-password"
          name="password"
          label="Mật khẩu"
          type="password"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          required
          hint="Mật khẩu được ẩn để bảo vệ tài khoản của bạn."
          error={errors.password}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox id="login-remember" name="remember">Ghi nhớ đăng nhập</Checkbox>
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <Button type="submit" className="w-full">{pending ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
        <AuthFeedback notice={notice} failure={failure} />
        </fieldset>
      </form>
      <p className="text-center text-sm text-muted">
        Chưa có tài khoản? <Link href="/register" className="ml-1 font-semibold text-brand hover:underline">Đăng ký ngay</Link>
      </p>
      <p className="text-xs text-muted">Thông tin của bạn được bảo mật và chỉ sử dụng để mang đến trải nghiệm tốt hơn tại Petly.</p>
    </>
  );
}
