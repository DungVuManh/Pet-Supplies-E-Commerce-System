"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { CustomerProfile, ProfileFormValues } from "../types";

interface ProfileEditProps {
  profile: CustomerProfile;
  onSave: (values: ProfileFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function ProfileEdit({
  profile,
  onSave,
  onCancel,
  isSaving,
}: ProfileEditProps) {
  // Format initial DOB to YYYY-MM-DD for <input type="date" />
  const initialDobFormatted = profile.dob
    ? new Date(profile.dob).toISOString().split("T")[0]
    : "1998-06-18";

  const [fullName, setFullName] = useState(profile.fullName || "Nguyễn Minh Anh");
  const [phone, setPhone] = useState(profile.phone || "0974 175 587");
  const [dob, setDob] = useState(initialDobFormatted);
  const [gender, setGender] = useState<string>(profile.gender || "female");
  const [avatarUrl, setAvatarUrl] = useState<string>(
    profile.avatarUrl || "/images/customer-avatar.jpg",
  );

  const [avatarError, setAvatarError] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      nextErrors.phone = "Số điện thoại Việt Nam không hợp lệ (ví dụ: 0974 175 587).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const [isNewAvatar, setIsNewAvatar] = useState(false);

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setAvatarError("");
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Chỉ chấp nhận định dạng JPG hoặc PNG.");
      return;
    }

    // Limit 5MB raw
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Dung lượng ảnh tối đa là 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result;
      if (typeof dataUrl !== "string") return;

      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 512;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          setAvatarUrl(compressed);
          setIsNewAvatar(true);
        } else {
          setAvatarUrl(dataUrl);
          setIsNewAvatar(true);
        }
      };
      img.onerror = () => {
        setAvatarError("Không thể đọc định dạng file ảnh.");
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setAvatarError("Không thể tải file ảnh.");
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting same file works
    e.target.value = "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    await onSave({
      fullName: fullName.trim(),
      phone: phone.trim(),
      dob: dob || undefined,
      gender,
      avatarUrl,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
        <h1 className="text-xl font-bold text-ink sm:text-2xl">
          Chỉnh sửa thông tin cá nhân
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cập nhật thông tin để Petly phục vụ bạn tốt hơn
        </p>

        {/* 2 Columns: Form & Avatar */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Basic Information Form */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <h2 className="text-base font-bold text-ink mb-6">
                Thông tin cơ bản
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="edit-fullname"
                    className="block text-xs font-semibold text-ink"
                  >
                    Họ và tên <span className="text-danger">*</span>
                  </label>
                  <input
                    id="edit-fullname"
                    type="text"
                    required
                    disabled={isSaving}
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) {
                        setErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    placeholder="Nguyễn Minh Anh"
                    className={`mt-1.5 block w-full min-h-11 rounded-xl border bg-surface px-4 text-sm text-ink transition-colors placeholder:text-muted focus:outline-hidden ${
                      errors.fullName
                        ? "border-danger focus:border-danger focus:ring-1 focus:ring-danger"
                        : "border-line focus:border-brand focus:ring-1 focus:ring-brand"
                    } disabled:cursor-not-allowed disabled:bg-canvas`}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-danger font-medium">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="edit-phone"
                    className="block text-xs font-semibold text-ink"
                  >
                    Số điện thoại <span className="text-danger">*</span>
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    required
                    disabled={isSaving}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) {
                        setErrors((prev) => ({ ...prev, phone: undefined }));
                      }
                    }}
                    placeholder="0974 175 587"
                    className={`mt-1.5 block w-full min-h-11 rounded-xl border bg-surface px-4 text-sm text-ink transition-colors placeholder:text-muted focus:outline-hidden ${
                      errors.phone
                        ? "border-danger focus:border-danger focus:ring-1 focus:ring-danger"
                        : "border-line focus:border-brand focus:ring-1 focus:ring-brand"
                    } disabled:cursor-not-allowed disabled:bg-canvas`}
                  />
                  {errors.phone ? (
                    <p className="mt-1 text-xs text-danger font-medium">
                      {errors.phone}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">
                      Số điện thoại dùng để nhận mã OTP và liên hệ giao hàng
                    </p>
                  )}
                </div>

                {/* Email (Read-Only) */}
                <div>
                  <label
                    htmlFor="edit-email"
                    className="block text-xs font-semibold text-ink"
                  >
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    disabled
                    readOnly
                    value={profile.email || "minhanh.nguyen@gmail.com"}
                    className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-canvas/80 px-4 text-sm text-muted cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Email dùng để đăng nhập và nhận hóa đơn điện tử
                  </p>
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="edit-dob"
                      className="block text-xs font-semibold text-ink"
                    >
                      Ngày sinh
                    </label>
                    <input
                      id="edit-dob"
                      type="date"
                      disabled={isSaving}
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-gender"
                      className="block text-xs font-semibold text-ink"
                    >
                      Giới tính
                    </label>
                    <select
                      id="edit-gender"
                      disabled={isSaving}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    >
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-line/60">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={onCancel}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-6 text-sm font-semibold text-ink shadow-xs transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Avatar & Security Note */}
          <div className="space-y-6 lg:col-span-4">
            {/* Avatar Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-xs">
              <h2 className="text-base font-bold text-ink mb-6 text-left">
                Ảnh đại diện
              </h2>

              <div className="flex flex-col items-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-2xl border-2 border-brand/20 bg-canvas shadow-sm">
                  <Image
                    src={avatarUrl}
                    alt={fullName}
                    width={128}
                    height={128}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                  {isNewAvatar && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      Mới
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-canvas"
                >
                  <svg
                    className="h-4 w-4 text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.75"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                    />
                  </svg>
                  <span>Thay đổi ảnh</span>
                </button>

                {isNewAvatar && (
                  <p className="mt-2 text-xs font-semibold text-success">
                    ✓ Đã chọn ảnh mới. Nhấn &quot;Lưu thay đổi&quot; để áp dụng.
                  </p>
                )}

                {avatarError && (
                  <p className="mt-2 text-xs text-danger font-medium">
                    {avatarError}
                  </p>
                )}

                <div className="mt-3 text-center text-[11px] text-muted leading-relaxed">
                  <p>Định dạng: JPG, PNG · Tối đa 2MB</p>
                  <p>Nên chọn ảnh vuông, rõ mặt</p>
                </div>
              </div>
            </div>

            {/* Security Notice Box */}
            <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-subtle/50 p-5 text-xs text-brand leading-relaxed">
              <svg
                className="h-5 w-5 shrink-0 text-brand mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
              <div>
                <strong className="block font-semibold text-brand mb-1">
                  Lưu ý bảo mật
                </strong>
                <p className="text-muted text-xs leading-relaxed">
                  Để bảo vệ tài khoản, một số thông tin nhạy cảm như Email chỉ có thể thay đổi sau khi xác thực OTP qua số điện thoại.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
