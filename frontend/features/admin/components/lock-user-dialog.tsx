"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { Field, control, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";

type LockUserDialogProps = {
  open: boolean;
  locked: boolean;
  account: string;
  reason: string;
  reasonError: string;
  formError: string;
  pending: boolean;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirmation for locking (with a required reason) or unlocking an account. Native modal: traps focus and returns it to the trigger. */
export function LockUserDialog({ open, locked, account, reason, reasonError, formError, pending, onReasonChange, onConfirm, onClose }: LockUserDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reasonField = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  useEffect(() => {
    if (reasonError) reasonField.current?.focus();
  }, [reasonError]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm();
  }

  return <dialog ref={dialog} aria-labelledby="lock-user-title" aria-describedby="lock-user-description"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-6 text-ink backdrop:bg-ink/40">
    <form noValidate onSubmit={submit} aria-busy={pending}>
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <h2 id="lock-user-title" className="text-xl font-semibold">{locked ? "Mở khóa tài khoản?" : "Khóa tài khoản?"}</h2>
        <p id="lock-user-description" className="text-sm leading-relaxed text-muted">{locked
          ? `${account} có thể đăng nhập lại sau khi được mở khóa.`
          : `${account} sẽ bị đăng xuất ngay và không thể đăng nhập cho đến khi được mở khóa.`}</p>
        {!locked && <Field label="Lý do khóa" htmlFor="lock-reason">
          <textarea ref={reasonField} id="lock-reason" required maxLength={200} value={reason} onChange={(event) => onReasonChange(event.target.value)}
            aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "lock-reason-error" : undefined}
            className={`${control} h-auto min-h-28 w-full py-3 leading-relaxed`} />
          {reasonError && <p id="lock-reason-error" className="mt-2 text-sm text-danger">{reasonError}</p>}
        </Field>}
        {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={`${secondaryButton} min-h-12`}>Hủy</button>
          <button type="submit" className={`${locked ? primaryLink : dangerButton} min-h-12`}>
            {pending ? "Đang xử lý…" : locked ? "Mở khóa" : "Khóa tài khoản"}
          </button>
        </div>
      </fieldset>
    </form>
  </dialog>;
}
