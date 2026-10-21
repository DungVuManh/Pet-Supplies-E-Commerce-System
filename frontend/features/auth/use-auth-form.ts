"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { AuthErrors } from "./validation";
import { authErrorMessage } from "./errors";

export function useAuthForm(validate: (data: FormData) => AuthErrors, submit: (data: FormData) => Promise<void | string>) {
  const [errors, setErrors] = useState<AuthErrors>({});
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  const locked = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors = validate(data);
    setSubmitted(true);
    setErrors(nextErrors);
    setNotice("");
    setFailure("");
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      setNotice("");
      form.querySelector<HTMLInputElement>(`[name="${firstError}"]`)?.focus();
      return;
    }
    locked.current = true;
    setPending(true);
    try { setNotice((await submit(data)) || ""); }
    catch (error) { setFailure(authErrorMessage(error)); }
    finally { locked.current = false; setPending(false); }
  }

  function onChange(event: ChangeEvent<HTMLFormElement>) {
    setNotice("");
    setFailure("");
    if (submitted) setErrors(validate(new FormData(event.currentTarget)));
  }

  return { errors, notice, failure, pending, setNotice, onSubmit, onChange };
}
