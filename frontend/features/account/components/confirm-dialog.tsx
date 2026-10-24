"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Xác nhận xóa",
  cancelLabel = "Hủy",
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen && !isPending) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isPending) onClose();
        }}
      />

      {/* Dialog Body */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
      >
        <h3
          id="confirm-dialog-title"
          className="text-lg font-semibold text-ink"
        >
          {title}
        </h3>
        <p
          id="confirm-dialog-description"
          className="mt-2 text-sm text-muted leading-relaxed"
        >
          {description}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-danger px-5 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
          >
            {isPending ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
