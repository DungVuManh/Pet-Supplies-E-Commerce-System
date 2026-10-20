import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
};

export function AuthCard({ title, description, children, compact = false }: AuthCardProps) {
  return (
    <section aria-labelledby="auth-heading" className={`flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-6 sm:p-8 ${compact ? "gap-4" : "gap-6"}`}>
      <div className="flex flex-col gap-2">
        <h1 id="auth-heading" className="text-[28px] font-semibold tracking-[-0.8px] sm:text-[32px]">{title}</h1>
        <p className="text-sm leading-[1.6] text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
