import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <AuthCard title="Chào mừng trở lại!" description="Đăng nhập để tiếp tục chăm sóc các bé cùng Petly.">
      <LoginForm />
    </AuthCard>
  );
}
