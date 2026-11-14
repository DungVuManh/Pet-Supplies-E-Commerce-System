"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { lockUser, unlockUser } from "../services/users";
import type { AdminUserDetail, UserLockResult } from "../types";
import { validateLockReason } from "../validation";

type LockState = Pick<UserLockResult, "status" | "lockedAt" | "lockReason">;

const lockState = ({ status, lockedAt, lockReason }: LockState): LockState => ({ status, lockedAt, lockReason });

/** The lock state of one account, and the confirmation that changes it (CR-12). */
export function useUserLock(user: AdminUserDetail) {
  const router = useRouter();
  const [lock, setLock] = useState(() => lockState(user));
  const [loadedUser, setLoadedUser] = useState(user);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  // Newly loaded server data wins over the last response.
  if (loadedUser !== user) {
    setLoadedUser(user);
    setLock(lockState(user));
  }

  const locked = lock.status === "locked";

  function openDialog() {
    setReason("");
    setReasonError("");
    setFormError("");
    setNotice("");
    setOpen(true);
  }

  function closeDialog() {
    if (!pending) setOpen(false);
  }

  function changeReason(value: string) {
    setReason(value);
    setReasonError("");
    setFormError("");
  }

  async function confirm() {
    if (pending) return;
    if (!locked) {
      const error = validateLockReason(reason);
      setReasonError(error);
      if (error) return;
    }
    setFormError("");
    setPending(true);
    try {
      const result = locked ? await unlockUser(user.id) : await lockUser(user.id, reason.trim());
      setLock(lockState(result));
      setOpen(false);
      setNotice(`${locked ? "Đã mở khóa" : "Đã khóa"} tài khoản ${user.code}.`);
      router.refresh(); // The new audit entry belongs in the activity table.
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      if (error instanceof ApiError && error.status === 409) {
        // Another Admin got there first: show what is true now.
        setOpen(false);
        setNotice(message);
        router.refresh();
      } else {
        setFormError(message);
      }
    } finally {
      setPending(false);
    }
  }

  return { ...lock, locked, open, reason, reasonError, formError, pending, notice, openDialog, closeDialog, changeReason, confirm };
}
