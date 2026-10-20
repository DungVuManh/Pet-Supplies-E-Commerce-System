"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/text-field";
import { validateRegister } from "../validation";
import { useAuthForm } from "../use-auth-form";
import { AuthNotice } from "./auth-notice";

export function RegisterForm() {
  const { errors, notice, onSubmit, onChange } = useAuthForm(
    validateRegister,
    "Thông tin hợp lệ. Chức năng tạo tài khoản sẽ sớm có mặt.",
  );

  return (
    <>
      <form method="post" noValidate onSubmit={onSubmit} onChange={onChange} className="flex flex-col gap-4" aria-label="Đăng ký tài khoản">
        <TextField id="register-name" name="fullName" label="Họ và tên" placeholder="Nhập họ và tên của bạn" autoComplete="name" maxLength={100} required error={errors.fullName} />
        <TextField id="register-phone" name="phone" label="Số điện thoại" type="tel" placeholder="Nhập số điện thoại" autoComplete="tel" maxLength={20} required error={errors.phone} />
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
        <Checkbox id="register-terms" name="terms" required error={errors.terms}>
          Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của Petly.
        </Checkbox>
        <Button type="submit" className="w-full">Tạo tài khoản</Button>
        <AuthNotice>{notice}</AuthNotice>
      </form>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản? <Link href="/login" className="ml-1 font-semibold text-brand hover:underline">Đăng nhập</Link>
      </p>
    </>
  );
}
