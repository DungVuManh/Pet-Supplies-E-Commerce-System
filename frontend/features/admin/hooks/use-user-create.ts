"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { createUser } from "../services/users";
import type { AdminUserDetail } from "../types";
import { validateUserCreate, type UserCreateValues } from "../validation";
import { usePasswordReset } from "./use-password-reset";

type FieldErrors = Partial<Record<keyof UserCreateValues, string>>;

const fieldOrder: (keyof UserCreateValues)[] = ["fullName", "email", "phone", "adminNote"];
const empty: UserCreateValues = { fullName: "", email: "", phone: "", adminNote: "" };

/**
 * The new Staff account page. After the account exists, the password email is
 * sent from the browser; a failed send can be retried without creating it again.
 */
export function useUserCreate() {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<AdminUserDetail | null>(null);
  const reset = usePasswordReset(created?.email ?? "");

  function set<K extends keyof UserCreateValues>(key: K, value: UserCreateValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = fieldOrder.find((name) => found[name]);
    if (first) requestAnimationFrame(() => document.getElementById(`user-${first}`)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError("");
    const found = validateUserCreate(values);
    if (Object.keys(found).length > 0) { showErrors(found); return; }
    setErrors({});

    setPending(true);
    try {
      const user = await createUser({
        fullName: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim(), adminNote: values.adminNote.trim(),
      });
      setCreated(user);
      void reset.send(user.email);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) showErrors(error.fields as FieldErrors);
      else setFormError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  function startOver() {
    setCreated(null);
    setValues(empty);
    setErrors({});
    reset.clear();
  }

  return { values, errors, formError, pending, created, reset, set, submit, startOver };
}
