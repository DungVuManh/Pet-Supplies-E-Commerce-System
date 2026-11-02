"use client";

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";

type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  error?: string;
  pending: boolean;
  /** Extra fields, such as a required reason. */
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirmation for a destructive action (CR-12). A native modal: it traps focus and returns it to the trigger. */
export function AdminConfirmDialog({ open, title, description, confirmLabel, danger = false, error, pending, children, onConfirm, onClose }: AdminConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm();
  }

  return <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-6 text-ink backdrop:bg-ink/40">
    <form noValidate onSubmit={submit} aria-busy={pending}>
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <h2 id={`${id}-title`} className="text-xl font-semibold">{title}</h2>
        <p id={`${id}-description`} className="text-sm leading-relaxed text-muted">{description}</p>
        {children}
        {error && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{error}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={`${secondaryButton} min-h-12`}>Hủy</button>
          <button type="submit" className={`${danger ? dangerButton : primaryLink} min-h-12`}>{pending ? "Đang xử lý…" : confirmLabel}</button>
        </div>
      </fieldset>
    </form>
  </dialog>;
}
