"use client";

import { Button } from "@/components/ui/button";
import { completeProfile } from "../auth-actions";
import { useAuthForm } from "../use-auth-form";
import { validateProfile } from "../validation";
import type { AuthUser } from "../types";
import { ProfileFields, TermsCheckbox } from "./profile-fields";
import { AuthFeedback } from "./auth-feedback";

export function CompleteProfileForm({ remember, onSuccess, onCancel }: {
  remember: boolean; onSuccess: (user: AuthUser) => void; onCancel: () => Promise<void>;
}) {
  const { errors, notice, failure, pending, onSubmit, onChange } = useAuthForm(validateProfile, async (data) => {
    const user = await completeProfile({ fullName: String(data.get("fullName") || "").trim(),
      phone: String(data.get("phone") || "").trim(), terms: data.get("terms") === "on" }, remember);
    onSuccess(user);
  });
  return <form noValidate onSubmit={onSubmit} onChange={onChange} aria-label="Hoàn tất hồ sơ" aria-busy={pending}>
    <fieldset disabled={pending} className="flex min-w-0 flex-col gap-4">
      <p role="status" className="text-sm text-muted">Tài khoản đã có trên Firebase. Hãy hoàn tất hồ sơ để tiếp tục sử dụng Petjoy.</p>
      <ProfileFields errors={errors} prefix="complete-profile" />
      <TermsCheckbox id="complete-profile-terms" error={errors.terms} />
      <Button type="submit">{pending ? "Đang lưu hồ sơ…" : "Hoàn tất và đăng nhập"}</Button>
      <AuthFeedback notice={notice} failure={failure} />
      <button type="button" className="min-h-11 text-sm font-semibold text-brand hover:underline" onClick={() => { void onCancel(); }}>Quay lại đăng nhập</button>
    </fieldset>
  </form>;
}
