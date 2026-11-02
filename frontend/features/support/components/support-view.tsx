"use client";

// =============================================================
// features/support/components/support-view.tsx
// Component chính cho trang Hỗ trợ & Liên hệ Petjoy (căn giữa form gửi tin nhắn)
// =============================================================

import React from "react";
import { ContactForm } from "./contact-form";

export function SupportView() {
  return (
    <div className="mx-auto w-full max-w-2xl py-2 sm:py-6">
      <ContactForm />
    </div>
  );
}
