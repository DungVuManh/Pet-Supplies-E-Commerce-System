"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { validateRegister } from "../validation";
import { useAuthForm } from "../use-auth-form";
import { AuthFeedback } from "./auth-feedback";
import { ProfileFields, TermsCheckbox } from "./profile-fields";
import { CompleteProfileForm } from "./complete-profile-form";
import { GoogleAuthButton } from "./google-auth-button";
import { registerWithEmail, loginWithGoogle, clearFirebaseIdentity } from "../auth-actions";
import { authErrorMessage } from "../errors";
import { useAuth } from "../auth-provider";
import type { AuthUser } from "../types";

export function RegisterForm() {
  const router = useRouter();
  const { acceptUser } = useAuth();
  const [needsProfile, setNeedsProfile] = useState(false);
  const [initialFullName, setInitialFullName] = useState("");
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState("");

  function finish(user: AuthUser) {
    acceptUser(user);
    let safeRedirect: string | null = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get("redirect") || params.get("next");
      if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
        safeRedirect = redirectParam;
      }
    }
    let target = "/";
    if (safeRedirect && !safeRedirect.startsWith("/admin") && !safeRedirect.startsWith("/staff")) {
      target = safeRedirect;
    }
    router.replace(target);
  }

  const { errors, notice, failure, pending, onSubmit, onChange } = useAuthForm(validateRegister, async (data) => {
    const user = await registerWithEmail(String(data.get("email") || "").trim(), String(data.get("password") || ""), {
      fullName: String(data.get("fullName") || "").trim(), phone: String(data.get("phone") || "").trim(),
      terms: data.get("terms") === "on",
    });
    finish(user);
  });

  async function handleGoogleRegister() {
    setGoogleError("");
    setGooglePending(true);
    try {
      const result = await loginWithGoogle(false);
      if (result.needsProfile) {
        setInitialFullName(result.initialFullName);
        setNeedsProfile(true);
        return;
      }
      if (result.user) {
        finish(result.user);
      }
    } catch (error: unknown) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      console.error("[Google Auth Error]", error);
      setGoogleError(authErrorMessage(error));
    } finally {
      setGooglePending(false);
    }
  }

  if (needsProfile) return (
    <CompleteProfileForm
      remember={false}
      initialFullName={initialFullName}
      onSuccess={finish}
      onCancel={async () => {
        await clearFirebaseIdentity();
        setNeedsProfile(false);
      }}
    />
  );

  return (
    <>
      <form method="post" noValidate onSubmit={onSubmit} onChange={onChange} aria-busy={pending} aria-label="Đăng ký tài khoản">
        <fieldset disabled={pending || googlePending} className="flex min-w-0 flex-col gap-4">
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
        <p id="register-password-guidance" className="text-xs text-muted">Hơn 6 ký tự, không tính khoảng trắng.</p>
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

        <div className="relative my-1 flex items-center justify-center">
          <div className="w-full border-t border-line/60" />
          <span className="absolute bg-surface px-3 text-xs font-medium text-muted">
            hoặc đăng ký với
          </span>
        </div>

        <GoogleAuthButton
          text="Đăng ký bằng Google"
          loading={googlePending}
          disabled={pending || googlePending}
          onClick={handleGoogleRegister}
        />
        {googleError && (
          <p role="alert" className="text-center text-xs font-medium text-danger">
            {googleError}
          </p>
        )}
        </fieldset>
      </form>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản? <Link href="/login" className="ml-1 font-semibold text-brand hover:underline">Đăng nhập</Link>
      </p>
    </>
  );
}
