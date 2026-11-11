"use client";

import Image from "next/image";
import type { PetProfile } from "../types";

interface PetCardProps {
  pet: PetProfile;
  onEdit: (pet: PetProfile) => void;
  onDelete: (id: string) => void;
  onViewDetail?: (pet: PetProfile) => void;
}

export function getPetAgeText(pet: PetProfile): string {
  if (pet.age) {
    return pet.age.endsWith("tuổi") || pet.age.endsWith("tháng")
      ? pet.age
      : `${pet.age} tuổi`;
  }
  if (!pet.dob) return "Chưa cập nhật";
  const birth = new Date(pet.dob);
  if (isNaN(birth.getTime())) return "Chưa cập nhật";

  const now = new Date();
  const diffMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());

  if (diffMonths < 1) return "Dưới 1 tháng tuổi";
  if (diffMonths < 12) return `${diffMonths} tháng tuổi`;

  const years = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  if (remainingMonths === 0) return `${years} tuổi`;
  return `${years} tuổi ${remainingMonths} tháng`;
}

export function PetCard({ pet, onEdit, onDelete, onViewDetail }: PetCardProps) {
  const isDog = pet.species === "dog" || pet.species === "chó";
  const isCat = pet.species === "cat" || pet.species === "mèo";
  const speciesLabel = isDog ? "Chó cưng" : isCat ? "Mèo cưng" : "Thú cưng khác";
  const defaultImage = isDog
    ? "/images/pets/milo.jpg"
    : "/images/pets/luna.jpg";

  const imageSrc = pet.avatarUrl || defaultImage;
  const ageDisplay = getPetAgeText(pet);
  const weightDisplay =
    pet.weight !== undefined && pet.weight !== null
      ? `${pet.weight} kg`
      : "Chưa rõ";

  const sterilizationLabel =
    pet.isSterilized !== undefined
      ? pet.isSterilized
        ? "Đã triệt sản"
        : "Chưa triệt sản"
      : null;

  return (
    <div
      onClick={() => onViewDetail?.(pet)}
      role={onViewDetail ? "button" : undefined}
      tabIndex={onViewDetail ? 0 : undefined}
      onKeyDown={(e) => {
        if (onViewDetail && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onViewDetail(pet);
        }
      }}
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition-all hover:border-brand/40 hover:shadow-md ${
        onViewDetail ? "cursor-pointer text-left" : ""
      }`}
    >
      <div>
        {/* Top Pet Image Banner */}
        <div className="relative h-48 w-full overflow-hidden bg-canvas">
          <Image
            src={imageSrc}
            alt={pet.name}
            width={480}
            height={270}
            unoptimized
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {onViewDetail && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/20 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm">
                <span>Xem chi tiết</span>
                <svg
                  className="h-3.5 w-3.5 text-brand"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-5">
          {/* Header row: Name + Species Badge */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-ink transition-colors group-hover:text-brand sm:text-xl">
              {pet.name}
            </h3>
            <span className="inline-flex shrink-0 items-center rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand">
              {speciesLabel}
            </span>
          </div>

          {/* Breed */}
          <p className="mt-1 text-xs font-medium text-muted">
            {pet.breed || (isDog ? "Chưa rõ giống" : isCat ? "Chưa rõ giống" : "Khác")}
          </p>

          {/* Age & Weight & Gender & Triệt sản Row */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span className="text-muted">
              Tuổi: <strong className="font-semibold text-ink">{ageDisplay}</strong>
            </span>
            <span className="text-muted/60">·</span>
            <span className="text-muted">
              Cân nặng: <strong className="font-semibold text-ink">{weightDisplay}</strong>
            </span>
            {pet.gender && (
              <>
                <span className="text-muted/60">·</span>
                <span className="text-muted">
                  Giới tính: <strong className="font-semibold text-ink">{pet.gender}</strong>
                </span>
              </>
            )}
            {sterilizationLabel && (
              <>
                <span className="text-muted/60">·</span>
                <span className="text-muted">
                  <strong className="font-semibold text-ink">{sterilizationLabel}</strong>
                </span>
              </>
            )}
          </div>

          {/* Health Issues Badges */}
          {pet.healthIssues && pet.healthIssues.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pet.healthIssues.map((issue) => (
                <span
                  key={issue}
                  className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200/60"
                >
                  {issue}
                </span>
              ))}
            </div>
          )}

          {/* Identification or Personality or Notes */}
          {pet.identification && (
            <p className="mt-2.5 text-xs text-muted leading-relaxed line-clamp-1">
              <span className="font-medium text-ink/80">Đặc điểm:</span> {pet.identification}
            </p>
          )}

          {pet.personality && (
            <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-1">
              <span className="font-medium text-ink/80">Tính cách:</span> {pet.personality}
            </p>
          )}

          {pet.notes && !pet.identification && !pet.personality && (
            <p className="mt-2.5 text-xs text-muted leading-relaxed line-clamp-2">
              {pet.notes}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Action Row */}
      <div className="flex items-center justify-between border-t border-line/60 px-5 py-3.5 bg-surface">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(pet);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(pet._id);
          }}
          className="text-xs font-semibold text-danger hover:underline"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}
