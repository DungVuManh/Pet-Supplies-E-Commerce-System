"use client";

import Image from "next/image";
import Link from "next/link";
import type { CustomerProfile, ProfileStats } from "../types";

interface ProfileViewProps {
  profile: CustomerProfile;
  stats: ProfileStats;
  onEdit: () => void;
}

export function ProfileView({ profile, stats, onEdit }: ProfileViewProps) {
  // Format member since date
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "12/02/2026";

  const dobText = profile.dob
    ? new Date(profile.dob).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "18/06/1998";

  const genderText =
    profile.gender === "male"
      ? "Nam"
      : profile.gender === "other"
      ? "Khác"
      : "Nữ";

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-4 border-b border-line/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink sm:text-2xl">
              Thông tin cá nhân
            </h1>
            <p className="mt-1 text-sm text-muted">
              Quản lý thông tin hồ sơ để bảo mật tài khoản và nhận ưu đãi
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {/* Two Column Profile Details */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
          {/* Left Column: Avatar & Verification */}
          <div className="flex flex-col items-center text-center md:col-span-4 md:border-r md:border-line/60 md:pr-8">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-brand/20 bg-canvas shadow-sm">
              <Image
                src={profile.avatarUrl || "/images/customer-avatar.jpg"}
                alt={profile.fullName}
                width={112}
                height={112}
                unoptimized
                className="h-full w-full object-cover"
                priority
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-ink">
              {profile.fullName || "Nguyễn Minh Anh"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Thành viên từ {memberSince}
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-3 py-1 text-xs font-semibold text-success">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
              <span>Đã xác thực tài khoản</span>
            </div>

            <p className="mt-3 text-[11px] text-muted max-w-[200px]">
              Cung cấp ảnh rõ nét để tăng tính xác thực cho tài khoản
            </p>
          </div>

          {/* Right Column: Key-Value Information */}
          <div className="md:col-span-8 md:pl-4">
            <h3 className="text-base font-bold text-ink mb-4">
              Thông tin tài khoản
            </h3>

            <div className="divide-y divide-line/60 rounded-xl border border-line bg-canvas/40 px-5 text-sm">
              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <span className="text-muted">Họ và tên:</span>
                <span className="font-semibold text-ink">
                  {profile.fullName || "Nguyễn Minh Anh"}
                </span>
              </div>

              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <span className="text-muted">Số điện thoại:</span>
                <span className="font-semibold text-ink">
                  {profile.phone || "0974 175 587"}
                </span>
              </div>

              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <span className="text-muted">Email:</span>
                <span className="font-semibold text-ink">
                  {profile.email || "minhanh.nguyen@gmail.com"}
                </span>
              </div>

              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <span className="text-muted">Ngày sinh:</span>
                <span className="font-semibold text-ink">{dobText}</span>
              </div>

              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <span className="text-muted">Giới tính:</span>
                <span className="font-semibold text-ink">{genderText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Orders Stat */}
        <Link
          href="/account/orders"
          className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all hover:border-brand/40 hover:shadow-sm"
        >
          <div>
            <span className="text-xs font-medium text-muted">Đơn hàng</span>
            <p className="mt-1 text-2xl font-bold text-ink">
              {stats.orders ?? 5}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-brand group-hover:scale-105 transition-transform">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
          </div>
        </Link>

        {/* Pets Stat */}
        <Link
          href="/account/pets"
          className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all hover:border-brand/40 hover:shadow-sm"
        >
          <div>
            <span className="text-xs font-medium text-muted">Thú cưng</span>
            <p className="mt-1 text-2xl font-bold text-ink">
              {stats.pets ?? 2}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918"
              />
            </svg>
          </div>
        </Link>

        {/* Addresses Stat */}
        <Link
          href="/account/addresses"
          className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all hover:border-brand/40 hover:shadow-sm"
        >
          <div>
            <span className="text-xs font-medium text-muted">Địa chỉ</span>
            <p className="mt-1 text-2xl font-bold text-ink">
              {stats.addresses ?? 2}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
          </div>
        </Link>
      </div>

      {/* Bottom Blue Notice Box */}
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
        <p className="text-muted text-xs sm:text-sm">
          <strong className="text-brand">Ghi chú:</strong> Lần cập nhật thông tin gần nhất:{" "}
          <span className="font-semibold text-ink">22 Tháng 10, 2026</span>. Để thay đổi Email hoặc CCCD, vui lòng liên hệ bộ phận Chăm sóc khách hàng của Petly.
        </p>
      </div>
    </div>
  );
}
