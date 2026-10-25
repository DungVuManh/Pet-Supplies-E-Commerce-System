import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Đăng ký" };

export default function RegisterPage() {
  return (
    <AuthCard title="Tạo tài khoản Petjoy" description="Đồng hành cùng bạn và những người bạn nhỏ." compact>
      <RegisterForm />
    </AuthCard>
  );
}
