"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { updateUser, type UserEdit } from "../services/users";
import type { AdminUserDetail, UserRole, UserStatus } from "../types";
import { validateUser } from "../validation";

export type UserEditValues = { fullName: string; phone: string; role: UserRole; status: UserStatus; lockReason: string; adminNote: string };
type FieldName = keyof UserEditValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const formValues = (user: AdminUserDetail): UserEditValues => ({
  fullName: user.fullName, phone: user.phone, role: user.role, status: user.status, lockReason: "", adminNote: user.adminNote,
});

const editableFields = ["fullName", "phone", "role", "status", "adminNote"] as const;

/** Values, validation, and save for the Admin user edit form. Field ids are `user-<name>`. */
export function useUserEdit(initialUser: AdminUserDetail) {
  const router = useRouter();
  const [loadedUser, setLoadedUser] = useState(initialUser);
  const [user, setUser] = useState(initialUser);
  const [values, setValues] = useState(() => formValues(initialUser));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  // Newly loaded server data replaces the form, as after a conflict.
  if (loadedUser !== initialUser) {
    setLoadedUser(initialUser);
    setUser(initialUser);
    setValues(formValues(initialUser));
    setErrors({});
  }

  // Only a change from active to locked needs a reason.
  const locking = values.status === "locked" && user.status !== "locked";

  function set<K extends FieldName>(key: K, value: UserEditValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice("");
    setFormError("");
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = (["fullName", "phone", "role", "status", "lockReason", "adminNote"] as const).find((name) => found[name]);
    // After a server error the field may only be enabled again on the next render.
    if (first) requestAnimationFrame(() => document.getElementById(`user-${first}`)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setNotice("");
    setFormError("");
    const found = validateUser({ ...values, lockReason: locking ? values.lockReason : undefined });
    if (Object.keys(found).length > 0) { showErrors(found); return; }
    setErrors({});

    const edit: UserEdit = { expectedUpdatedAt: user.updatedAt };
    for (const name of editableFields) {
      if (values[name] !== formValues(user)[name]) Object.assign(edit, { [name]: values[name] });
    }
    if (Object.keys(edit).length === 1) { setNotice("Không có thay đổi nào để lưu."); return; }
    if (locking) edit.lockReason = values.lockReason.trim();

    setPending(true);
    try {
      const saved = await updateUser(user.id, edit);
      setUser(saved);
      setValues(formValues(saved));
      setNotice(saved.changed ? "Đã lưu thay đổi." : "Không có thay đổi nào để lưu.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNotice(error.message);
        router.refresh();
      } else if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        showErrors(error.fields);
      } else {
        setFormError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setPending(false);
    }
  }

  return { user, values, errors, notice, formError, pending, locking, set, submit };
}
