// =============================================================
// features/wishlist/components/wishlist-toast.tsx
// Toast thông báo nổi khi thao tác thành công hoặc lỗi
// Hỗ trợ nút hành động (ví dụ: "Đăng nhập ngay" khi chưa đăng nhập)
// =============================================================

"use client";

import Link from "next/link";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import React from "react";
import type { ToastInfo } from "../types";

interface WishlistToastProps {
  toasts: ToastInfo[];
  onDismiss: (id: number) => void;
}

export function WishlistToast({ toasts, onDismiss }: WishlistToastProps) {
  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Thông báo danh sách yêu thích"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl p-4 shadow-lg border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-300 ${
              isSuccess
                ? "bg-slate-900/95 text-white border-slate-800"
                : isError
                ? "bg-rose-900/95 text-white border-rose-800"
                : "bg-slate-900/95 text-white border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {isSuccess ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
              ) : isError ? (
                <XCircle className="size-5 shrink-0 text-rose-400" />
              ) : (
                <Info className="size-5 shrink-0 text-amber-400" />
              )}
              <span className="text-xs sm:text-sm font-medium leading-snug break-words">
                {toast.message}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {toast.action && (
                <Link
                  href={toast.action.href}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-hover transition-colors whitespace-nowrap"
                >
                  {toast.action.label}
                </Link>
              )}

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Đóng thông báo"
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
