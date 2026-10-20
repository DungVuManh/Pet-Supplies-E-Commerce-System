"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/text-field";
import { validateLogin } from "../validation";
import { useAuthForm } from "../use-auth-form";
import { AuthNotice } from "./auth-notice";

export function LoginForm() {
  const { errors, notice, setNotice, onSubmit, onChange } = useAuthForm(
    validateLogin,
    "Thông tin hợp lệ. Chức năng đăng nhập sẽ sớm có mặt.",
  );

  return (
    <>
      <form method="post" noValidate onSubmit={onSubmit} onChange={onChange} className="flex flex-col gap-5" aria-label="Đăng nhập">
        <TextField
          id="login-identifier"
          name="identifier"
          label="Email hoặc số điện thoại"
          placeholder="Nhập email hoặc số điện thoại"
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
          <button
            type="button"
            className="text-sm font-semibold text-brand hover:underline"
            onClick={() => setNotice("Vui lòng liên hệ 1900 636 789 để được hỗ trợ khôi phục mật khẩu.")}
          >
            Quên mật khẩu?
          </button>
        </div>
        <Button type="submit" className="w-full">Đăng nhập</Button>
        <AuthNotice>{notice}</AuthNotice>
      </form>
      <p className="text-center text-sm text-muted">
        Chưa có tài khoản? <Link href="/register" className="ml-1 font-semibold text-brand hover:underline">Đăng ký ngay</Link>
      </p>
      <p className="text-xs text-muted">Thông tin của bạn được bảo mật và chỉ sử dụng để mang đến trải nghiệm tốt hơn tại Petly.</p>
    </>
  );
}
