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
import { GoogleAuthButton } from "./google-auth-button";
import { AuthApiError } from "../api";
import {
 loginWithEmail,
 loginWithGoogle,
 clearFirebaseIdentity,
} from "../auth-actions";
import { authErrorMessage } from "../errors";
import { useAuth } from "../auth-provider";
import type { AuthUser } from "../types";

export function LoginForm() {
 const router = useRouter();
 const { acceptUser } = useAuth();
 const [needsProfile, setNeedsProfile] = useState(false);
 const [initialFullName, setInitialFullName] = useState("");
 const [remember, setRemember] = useState(false);
 const [googlePending, setGooglePending] = useState(false);
 const [googleError, setGoogleError] = useState("");
 function finish(user: AuthUser) {
  acceptUser(user);
  let safeRedirect: string | null = null;
  if (typeof window !== "undefined") {
   const params = new URLSearchParams(window.location.search);
   const redirectParam = params.get("redirect") || params.get("next");
   if (
    redirectParam &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//")
   ) {
    safeRedirect = redirectParam;
   }
  }

  if (user.role === "admin") {
   router.replace(
    safeRedirect && safeRedirect.startsWith("/admin")
     ? safeRedirect
     : "/admin/dashboard",
   );
  } else if (user.role === "staff") {
   router.replace(
    safeRedirect && safeRedirect.startsWith("/staff")
     ? safeRedirect
     : "/staff/dashboard",
   );
  } else {
   router.replace(safeRedirect || "/");
  }
 }
 const { errors, notice, failure, pending, onSubmit, onChange } = useAuthForm(
  validateLogin,
  async (data) => {
   const rememberChoice = data.get("remember") === "on";
   setRemember(rememberChoice);
   try {
    finish(
     await loginWithEmail(
      String(data.get("identifier") || "").trim(),
      String(data.get("password") || ""),
      rememberChoice,
     ),
    );
   } catch (error) {
    if (error instanceof AuthApiError && error.code === "PROFILE_INCOMPLETE") {
     setNeedsProfile(true);
     return;
    }
    throw error;
   }
  },
 );

 async function handleGoogleLogin() {
  setGoogleError("");
  setGooglePending(true);
  try {
   const result = await loginWithGoogle(remember);
   if (result.needsProfile) {
    setInitialFullName(result.initialFullName);
    setNeedsProfile(true);
    return;
   }
   if (result.user) {
    finish(result.user);
   }
  } catch (error: unknown) {
   const code =
    error && typeof error === "object" && "code" in error
     ? String(error.code)
     : "";
   if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
   ) {
    return;
   }
   console.error("[Google Auth Error]", error);
   setGoogleError(authErrorMessage(error));
  } finally {
   setGooglePending(false);
  }
 }

 if (needsProfile)
  return (
   <CompleteProfileForm
    remember={remember}
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
   <form
    method="post"
    noValidate
    onSubmit={onSubmit}
    onChange={onChange}
    aria-busy={pending}
    aria-label="Đăng nhập"
   >
    <fieldset
     disabled={pending || googlePending}
     className="flex min-w-0 flex-col gap-5"
    >
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
      <Checkbox
       id="login-remember"
       name="remember"
       checked={remember}
       onChange={(e) => setRemember(e.target.checked)}
      >
       Ghi nhớ đăng nhập
      </Checkbox>
      <Link
       href="/forgot-password"
       className="text-sm font-semibold text-brand hover:underline"
      >
       Quên mật khẩu?
      </Link>
     </div>
     <Button type="submit" className="w-full">
      {pending ? "Đang đăng nhập…" : "Đăng nhập"}
     </Button>
     <AuthFeedback notice={notice} failure={failure} />

     <div className="relative my-1 flex items-center justify-center">
      <div className="w-full border-t border-line/60" />
      <span className="absolute bg-surface px-3 text-xs font-medium text-muted">
       hoặc đăng nhập với
      </span>
     </div>

     <GoogleAuthButton
      text="Đăng nhập bằng Google"
      loading={googlePending}
      disabled={pending || googlePending}
      onClick={handleGoogleLogin}
     />
     {googleError && (
      <p role="alert" className="text-center text-xs font-medium text-danger">
       {googleError}
      </p>
     )}
    </fieldset>
   </form>
   <p className="text-center text-sm text-muted">
    Chưa có tài khoản?{" "}
    <Link
     href="/register"
     className="ml-1 font-semibold text-brand hover:underline"
    >
     Đăng ký ngay
    </Link>
   </p>
   <p className="text-xs text-muted">
    Thông tin của bạn được bảo mật và chỉ sử dụng để mang đến trải nghiệm tốt
    hơn tại Petjoy.
   </p>
  </>
 );
}
