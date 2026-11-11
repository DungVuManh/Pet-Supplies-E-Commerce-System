"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PetProfile } from "../types";
import { getPetAgeText } from "./pet-card";

interface PetDetailModalProps {
  isOpen: boolean;
  pet: PetProfile | null;
  onClose: () => void;
  onEdit: (pet: PetProfile) => void;
}

function formatDob(dateStr?: string | null): string {
  if (!dateStr) return "Chưa cập nhật";
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return dateStr;
  return birth.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PetDetailModal({
  isOpen,
  pet,
  onClose,
  onEdit,
}: PetDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !pet) return null;

  const isDog = pet.species === "dog" || pet.species === "chó";
  const isCat = pet.species === "cat" || pet.species === "mèo";
  const speciesLabel = isDog ? "Chó cưng" : isCat ? "Mèo cưng" : "Thú cưng khác";
  const speciesEmoji = isDog ? "🐶" : isCat ? "🐱" : "🐾";

  const defaultImage = isDog
    ? "/images/pets/milo.jpg"
    : "/images/pets/luna.jpg";
  const imageSrc = pet.avatarUrl || defaultImage;

  const ageDisplay = getPetAgeText(pet);
  const dobDisplay = formatDob(pet.dob);
  const weightDisplay =
    pet.weight !== undefined && pet.weight !== null
      ? `${pet.weight} kg`
      : "Chưa cập nhật";

  const sterilizationLabel =
    pet.isSterilized !== undefined
      ? pet.isSterilized
        ? "Đã triệt sản"
        : "Chưa triệt sản"
      : "Chưa cập nhật";

  // Dynamic Shopping Recommendations according to pet species
  const foodTitle = isDog
    ? "Thức ăn cho Chó"
    : isCat
    ? "Thức ăn cho Mèo"
    : "Thức ăn thú cưng";

  const foodLink = isDog
    ? "/products?category=thuc-an-cho-cho&petType=dog"
    : isCat
    ? "/products?category=thuc-an-cho-meo&petType=cat"
    : "/products?category=thuc-an-cho-cho";

  const foodDescription = isDog
    ? "Hạt dinh dưỡng, pate cho chó và các loại xương gặm, bánh thưởng"
    : isCat
    ? "Hạt khô cao cấp, pate cho mèo và bánh súp thưởng thơm ngon"
    : "Các loại hạt, pate và bánh thưởng dinh dưỡng";

  const hygieneTitle = isDog
    ? "Vệ sinh cho Chó"
    : isCat
    ? "Vệ sinh cho Mèo"
    : "Vệ sinh thú cưng";

  const hygieneLink = isDog
    ? "/products?category=cham-soc-ve-sinh-cho-cho&petType=dog"
    : isCat
    ? "/products?category=cat-meo&petType=cat"
    : "/products?category=cham-soc-ve-sinh-cho-cho";

  const hygieneDescription = isDog
    ? "Sữa tắm mượt lông, dung dịch tai mắt, tã bỉm và xịt khử mùi"
    : isCat
    ? "Cát vệ sinh khử mùi, máy dọn tự động, sữa tắm và khử khuẩn"
    : "Sản phẩm chăm sóc, vệ sinh và khử mùi an toàn";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        className="relative z-10 my-6 flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Hero Banner with Avatar */}
        <div className="relative h-52 sm:h-64 w-full overflow-hidden bg-canvas">
          <Image
            src={imageSrc}
            alt={pet.name}
            width={800}
            height={450}
            unoptimized
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />

          {/* Species Badge */}
          <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3.5 py-1.5 text-xs font-bold text-brand shadow-sm backdrop-blur-md">
            <span>{speciesEmoji}</span>
            <span>{speciesLabel}</span>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết thú cưng"
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur-md transition-colors hover:bg-surface hover:text-brand"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="max-h-[calc(90vh-16rem)] overflow-y-auto px-6 py-5 sm:px-8">
          {/* Header: Pet Name & Breed */}
          <div className="border-b border-line/60 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="pet-detail-title"
                  className="text-2xl font-extrabold text-ink sm:text-3xl tracking-tight"
                >
                  {pet.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-muted">
                  Giống loài:{" "}
                  <strong className="font-semibold text-ink">
                    {pet.breed || (isDog ? "Chưa rõ giống chó" : isCat ? "Chưa rõ giống mèo" : "Khác")}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(pet);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-subtle px-4 py-2 text-xs font-bold text-brand transition-colors hover:bg-brand hover:text-white"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                  />
                </svg>
                <span>Chỉnh sửa hồ sơ</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-canvas/60 p-3.5">
              <span className="text-xs text-muted block">Tuổi</span>
              <strong className="mt-1 text-sm font-bold text-ink block truncate">
                {ageDisplay}
              </strong>
            </div>

            <div className="rounded-2xl border border-line bg-canvas/60 p-3.5">
              <span className="text-xs text-muted block">Cân nặng</span>
              <strong className="mt-1 text-sm font-bold text-ink block truncate">
                {weightDisplay}
              </strong>
            </div>

            <div className="rounded-2xl border border-line bg-canvas/60 p-3.5">
              <span className="text-xs text-muted block">Giới tính</span>
              <strong className="mt-1 text-sm font-bold text-ink block truncate">
                {pet.gender || "Chưa cập nhật"}
              </strong>
            </div>

            <div className="rounded-2xl border border-line bg-canvas/60 p-3.5">
              <span className="text-xs text-muted block">Triệt sản</span>
              <strong className="mt-1 text-sm font-bold text-ink block truncate">
                {sterilizationLabel}
              </strong>
            </div>
          </div>

          {/* Date of Birth info */}
          {pet.dob && (
            <div className="mt-3.5 flex items-center gap-2 text-xs text-muted">
              <svg
                className="h-4 w-4 text-muted/80 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.253M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
              <span>Ngày sinh: <strong className="font-semibold text-ink">{dobDisplay}</strong></span>
            </div>
          )}

          {/* Health Issues Badges */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
              Vấn đề sức khoẻ
            </h4>
            {pet.healthIssues && pet.healthIssues.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {pet.healthIssues.map((issue) => (
                  <span
                    key={issue}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>{issue}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Bé chưa ghi nhận vấn đề sức khoẻ đặc biệt.
              </p>
            )}
          </div>

          {/* Characteristics & Personality */}
          {(pet.identification || pet.personality || pet.notes) && (
            <div className="mt-6 space-y-3 rounded-2xl border border-line bg-canvas/40 p-4">
              {pet.identification && (
                <div>
                  <h5 className="text-xs font-bold text-ink">Đặc điểm nhận dạng:</h5>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {pet.identification}
                  </p>
                </div>
              )}

              {pet.personality && (
                <div>
                  <h5 className="text-xs font-bold text-ink">Tính cách:</h5>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {pet.personality}
                  </p>
                </div>
              )}

              {pet.notes && (
                <div>
                  <h5 className="text-xs font-bold text-ink">Ghi chú thêm:</h5>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {pet.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SHOPPING SECTION: "Mua sắm cho [tên thú cưng]" */}
          <div className="mt-7 rounded-3xl border border-brand/25 bg-linear-to-br from-brand-subtle/50 via-surface to-brand-subtle/25 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5 text-brand">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white shadow-2xs text-sm">
                🛍️
              </span>
              <div>
                <h3 className="text-base font-bold text-ink sm:text-lg">
                  Mua sắm cho {pet.name}
                </h3>
                <p className="text-xs text-muted">
                  Gợi ý các mặt hàng thiết yếu phù hợp nhất với {pet.name}
                </p>
              </div>
            </div>

            {/* Shopping Link Cards Grid */}
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* Food Category Card */}
              <Link
                href={foodLink}
                onClick={onClose}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-4.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-700 shadow-2xs">
                      🍲
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand group-hover:translate-x-1 transition-transform">
                      <span>Mua ngay</span>
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </span>
                  </div>

                  <h4 className="mt-3.5 text-sm font-bold text-ink group-hover:text-brand transition-colors">
                    {foodTitle}
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                    {foodDescription}
                  </p>
                </div>

                <div className="mt-4 border-t border-line/50 pt-2.5 text-[11px] font-semibold text-brand">
                  Khám phá danh mục Thức ăn →
                </div>
              </Link>

              {/* Hygiene Category Card */}
              <Link
                href={hygieneLink}
                onClick={onClose}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-4.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-2xl text-sky-700 shadow-2xs">
                      🧼
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand group-hover:translate-x-1 transition-transform">
                      <span>Mua ngay</span>
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </span>
                  </div>

                  <h4 className="mt-3.5 text-sm font-bold text-ink group-hover:text-brand transition-colors">
                    {hygieneTitle}
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                    {hygieneDescription}
                  </p>
                </div>

                <div className="mt-4 border-t border-line/50 pt-2.5 text-[11px] font-semibold text-brand">
                  Khám phá danh mục Vệ sinh →
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-line/60 bg-surface px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-canvas transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(pet);
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors shadow-xs"
          >
            Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}
