"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { AccountShell } from "@/features/account/components/account-shell";
import { ProfileView } from "@/features/account/components/profile-view";
import { ProfileEdit } from "@/features/account/components/profile-edit";
import { accountApi } from "@/features/account/api";
import type { CustomerProfile, ProfileStats, ProfileFormValues } from "@/features/account/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, status, acceptUser } = useAuth();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    orders: 5,
    pets: 2,
    addresses: 2,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (status === "ready" && !user) {
      router.replace("/login?redirect=/account/profile");
    }
  }, [status, user, router]);

  useEffect(() => {
    let active = true;
    accountApi
      .getProfile()
      .then((data) => {
        if (active) {
          setProfile(data.user);
          if (data.stats) setStats(data.stats);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          if (user) {
            // Fallback to auth user
            setProfile({
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              phone: user.phone || "0974 175 587",
              role: user.role,
              avatarUrl: user.avatarUrl || "/images/customer-avatar.jpg",
            });
          } else {
            setErrorMessage(
              err instanceof Error
                ? err.message
                : "Không thể tải thông tin hồ sơ tài khoản.",
            );
          }
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  async function handleSaveProfile(values: ProfileFormValues) {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const updated = await accountApi.updateProfile(values);
      const nextAvatar = updated.avatarUrl || values.avatarUrl;
      setProfile((prev) =>
        prev
          ? { ...prev, ...updated, avatarUrl: nextAvatar }
          : { ...values, ...updated, avatarUrl: nextAvatar },
      );
      setToastMessage("Thông tin của bạn đã được cập nhật.");
      setIsEditing(false);

      if (user) {
        acceptUser({
          ...user,
          fullName: updated.fullName,
          phone: updated.phone,
          avatarUrl: nextAvatar,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Chưa thể cập nhật thông tin. Vui lòng thử lại sau.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const currentProfile: CustomerProfile = profile || {
    id: user?.id || "",
    email: user?.email || "minhanh.nguyen@gmail.com",
    fullName: user?.fullName || "Nguyễn Minh Anh",
    phone: user?.phone || "0974 175 587",
    role: user?.role || "customer",
    dob: "1998-06-18",
    gender: "female",
    avatarUrl: user?.avatarUrl || "/images/customer-avatar.jpg",
    createdAt:
      user?.createdAt ||
      "2026-02-12T00:00:00.000Z",
  };

  return (
    <AccountShell activeTab="profile">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between rounded-2xl border border-success/30 bg-success-subtle p-4 text-sm font-semibold text-success shadow-xs"
        >
          <div className="flex items-center gap-3">
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
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="text-xs hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger-subtle p-4 text-sm font-semibold text-danger shadow-xs"
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

      {isLoading ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center text-sm text-muted shadow-xs">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand border-r-transparent" />
          <p className="mt-3">Đang tải thông tin tài khoản…</p>
        </div>
      ) : isEditing ? (
        <ProfileEdit
          profile={currentProfile}
          onSave={handleSaveProfile}
          onCancel={() => setIsEditing(false)}
          isSaving={isSaving}
        />
      ) : (
        <ProfileView
          profile={currentProfile}
          stats={stats}
          onEdit={() => setIsEditing(true)}
        />
      )}
    </AccountShell>
  );
}
