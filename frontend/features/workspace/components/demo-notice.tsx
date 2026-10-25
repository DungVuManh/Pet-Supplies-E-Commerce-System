"use client";

import { useState, type ReactNode } from "react";
import { primaryLink, secondaryButton } from "./workspace-ui";

/** Action without a backend yet: explains that nothing was saved, sent or downloaded. */
export function DemoNotice({ label, message, variant = "secondary", icon, className = "" }: { label: string; message?: string; variant?: "primary" | "secondary"; icon?: ReactNode; className?: string }) {
  const [notice, setNotice] = useState("");
  return <div className={`flex flex-col items-end gap-2 ${className}`}>
    <button type="button" className={`${variant === "primary" ? primaryLink : secondaryButton} min-h-12 gap-2`} onClick={() => setNotice(message || `“${label}” chưa kết nối backend; bản demo không lưu hay tạo tệp.`)}>{icon}{label}</button>
    {notice && <span role="status" className="max-w-72 text-right text-xs text-brand">{notice}</span>}
  </div>;
}
