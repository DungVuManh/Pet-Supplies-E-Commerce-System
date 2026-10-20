import type { ComponentProps } from "react";

export function Button({ className = "", type = "button", ...props }: ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
