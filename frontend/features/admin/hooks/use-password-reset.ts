"use client";

import { useState } from "react";
import { sendPasswordReset } from "@/lib/password-reset";

export type PasswordResetState = "idle" | "sending" | "sent" | "failed";

/** Firebase codes worth explaining; anything else gets the generic retry message. */
function failureMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "auth/too-many-requests") return "Đã gửi quá nhiều email. Vui lòng thử lại sau ít phút.";
  if (code === "auth/network-request-failed") return "Không kết nối được dịch vụ xác thực. Kiểm tra mạng rồi thử lại.";
  if (code === "FIREBASE_CONFIG_MISSING") return "Trình duyệt chưa có cấu hình Firebase nên chưa thể gửi email.";
  return "Chưa thể gửi email đặt mật khẩu. Vui lòng thử lại.";
}

/**
 * Sends the Firebase password email to `email`. Firebase sends it from the
 * browser, as on the public forgot-password page, so it is never audited.
 */
export function usePasswordReset(email: string) {
  const [state, setState] = useState<PasswordResetState>("idle");
  const [message, setMessage] = useState("");

  /** `to` overrides the address, for an account created in this same event. */
  async function send(to = email) {
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      await sendPasswordReset(to);
      setState("sent");
      setMessage(`Đã gửi liên kết đặt mật khẩu tới ${to}.`);
    } catch (error) {
      setState("failed");
      setMessage(failureMessage(error));
    }
  }

  function clear() {
    setState("idle");
    setMessage("");
  }

  return { state, message, send, clear };
}
