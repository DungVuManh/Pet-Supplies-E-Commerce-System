import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return <AuthCard title="Quên mật khẩu?" description="Nhập email để nhận hướng dẫn đặt lại mật khẩu của bạn.">
    <ForgotPasswordForm />
  </AuthCard>;
}
