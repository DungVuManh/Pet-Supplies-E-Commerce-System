"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { accountApi } from "../api";

export function ProfileForm() {
  const { user, acceptUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const { user: profileUser } = await accountApi.getProfile();
        if (!cancelled) {
          setFullName(profileUser.fullName);
          setPhone(profileUser.phone);
          setEmail(profileUser.email);
        }
      } catch {
        // Fallback to auth context user
        if (!cancelled && user) {
          setFullName(user.fullName);
          setPhone(user.phone);
          setEmail(user.email);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function validate(): boolean {
    const nextErrors: { fullName?: string; phone?: string } = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      nextErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    } else if (fullName.trim().length > 100) {
      nextErrors.fullName = "Họ và tên tối đa 100 ký tự.";
    }

    const cleanPhone = phone.replace(/[\s.-]/g, "");
    if (!cleanPhone) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!/^(?:0|\+84)[0-9]{9}$/.test(cleanPhone)) {
      nextErrors.phone = "Số điện thoại Việt Nam không hợp lệ (ví dụ: 0912345678).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!validate()) return;

    setIsSaving(true);
    try {
      const updated = await accountApi.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setSuccessMessage("Thông tin của bạn đã được cập nhật.");
      setFullName(updated.fullName);
      setPhone(updated.phone);

      // Update auth context so header avatar & name reflect changes immediately
      if (user) {
        acceptUser({
          ...user,
          fullName: updated.fullName,
          phone: updated.phone,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Chưa thể cập nhật thông tin. Vui lòng thử lại sau.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="border-b border-line pb-6">
        <h2 className="text-xl font-bold text-ink">Thông tin cá nhân</h2>
        <p className="mt-1 text-sm text-muted">
          Quản lý thông tin họ tên, số điện thoại và địa chỉ liên lạc của bạn.
        </p>
      </div>

      {successMessage && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success-subtle p-4 text-sm font-semibold text-success"
        >
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-6 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-subtle p-4 text-sm font-semibold text-danger"
        >
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Full Name */}
        <div>
          <label
            htmlFor="profile-fullname"
            className="block text-sm font-semibold text-ink"
          >
            Họ và tên <span className="text-danger">*</span>
          </label>
          <input
            id="profile-fullname"
            type="text"
            required
            disabled={isLoading || isSaving}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            placeholder="Nhập họ và tên của bạn"
            className={`mt-2 block w-full min-h-12 rounded-lg border bg-surface px-4 text-sm text-ink transition-colors placeholder:text-muted focus:outline-hidden ${
              errors.fullName
                ? "border-danger focus:border-danger focus:ring-1 focus:ring-danger"
                : "border-line focus:border-brand focus:ring-1 focus:ring-brand"
            } disabled:cursor-not-allowed disabled:bg-canvas`}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "profile-fullname-error" : undefined}
          />
          {errors.fullName && (
            <p
              id="profile-fullname-error"
              role="alert"
              className="mt-1.5 text-xs font-semibold text-danger"
            >
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="profile-phone"
            className="block text-sm font-semibold text-ink"
          >
            Số điện thoại <span className="text-danger">*</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            required
            disabled={isLoading || isSaving}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            placeholder="Ví dụ: 0912345678"
            className={`mt-2 block w-full min-h-12 rounded-lg border bg-surface px-4 text-sm text-ink transition-colors placeholder:text-muted focus:outline-hidden ${
              errors.phone
                ? "border-danger focus:border-danger focus:ring-1 focus:ring-danger"
                : "border-line focus:border-brand focus:ring-1 focus:ring-brand"
            } disabled:cursor-not-allowed disabled:bg-canvas`}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "profile-phone-error" : undefined}
          />
          {errors.phone && (
            <p
              id="profile-phone-error"
              role="alert"
              className="mt-1.5 text-xs font-semibold text-danger"
            >
              {errors.phone}
            </p>
          )}
        </div>

        {/* Email - Read-only */}
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="profile-email"
              className="block text-sm font-semibold text-ink"
            >
              Địa chỉ Email
            </label>
            <span className="text-xs text-muted">Không thể thay đổi</span>
          </div>
          <input
            id="profile-email"
            type="email"
            disabled
            value={email}
            readOnly
            className="mt-2 block w-full min-h-12 rounded-lg border border-line bg-canvas px-4 text-sm text-muted cursor-not-allowed"
          />
          <p className="mt-1.5 text-xs text-muted">
            Email được gắn liền với tài khoản đăng nhập để đảm bảo tính an toàn.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || isSaving}
            className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-brand px-8 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Đang lưu thay đổi…" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
