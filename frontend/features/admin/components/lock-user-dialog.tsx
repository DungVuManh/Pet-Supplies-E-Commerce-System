"use client";

import { useEffect, useRef } from "react";
import { Field, control } from "@/components/workspace/workspace-ui";
import { AdminConfirmDialog } from "./admin-confirm-dialog";

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

/** Confirmation for locking (with a required reason) or unlocking an account. */
export function LockUserDialog({ open, locked, account, reason, reasonError, formError, pending, onReasonChange, onConfirm, onClose }: LockUserDialogProps) {
  const reasonField = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (reasonError) reasonField.current?.focus();
  }, [reasonError]);

  return <AdminConfirmDialog open={open} danger={!locked} pending={pending} error={formError} onConfirm={onConfirm} onClose={onClose}
    title={locked ? "Mở khóa tài khoản?" : "Khóa tài khoản?"}
    confirmLabel={locked ? "Mở khóa" : "Khóa tài khoản"}
    description={locked
      ? `${account} có thể đăng nhập lại sau khi được mở khóa.`
      : `${account} sẽ bị đăng xuất ngay và không thể đăng nhập cho đến khi được mở khóa.`}>
    {!locked && <Field label="Lý do khóa" htmlFor="lock-reason">
      <textarea ref={reasonField} id="lock-reason" required maxLength={200} value={reason} onChange={(event) => onReasonChange(event.target.value)}
        aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "lock-reason-error" : undefined}
        className={`${control} h-auto min-h-28 w-full py-3 leading-relaxed`} />
      {reasonError && <p id="lock-reason-error" className="mt-2 text-sm text-danger">{reasonError}</p>}
    </Field>}
  </AdminConfirmDialog>;
}
