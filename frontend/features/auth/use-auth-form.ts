"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import type { AuthErrors } from "./validation";

export function useAuthForm(validate: (data: FormData) => AuthErrors, validMessage: string) {
  const [errors, setErrors] = useState<AuthErrors>({});
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const nextErrors = validate(new FormData(form));
    setSubmitted(true);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      setNotice("");
      form.querySelector<HTMLInputElement>(`[name="${firstError}"]`)?.focus();
      return;
    }
    // Frontend preview only: no account request, session, or credential storage.
    setNotice(validMessage);
  }

  function onChange(event: ChangeEvent<HTMLFormElement>) {
    setNotice("");
    if (submitted) setErrors(validate(new FormData(event.currentTarget)));
  }

  return { errors, notice, setNotice, onSubmit, onChange };
}
