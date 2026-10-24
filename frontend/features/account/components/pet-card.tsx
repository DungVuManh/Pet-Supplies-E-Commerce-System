"use client";

import Image from "next/image";
import type { PetProfile } from "../types";

interface PetCardProps {
  pet: PetProfile;
  onEdit: (pet: PetProfile) => void;
  onDelete: (id: string) => void;
}

function getPetAgeText(pet: PetProfile): string {
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

export function PetCard({ pet, onEdit, onDelete }: PetCardProps) {
  const isDog = pet.species === "dog" || pet.species === "chó";
  const speciesLabel = isDog ? "Chó cưng" : "Mèo cưng";
  const defaultImage = isDog
    ? "/images/pets/milo.jpg"
    : "/images/pets/luna.jpg";

  const imageSrc = pet.avatarUrl || defaultImage;
  const ageDisplay = getPetAgeText(pet);
  const weightDisplay =
    pet.weight !== undefined && pet.weight !== null
      ? `${pet.weight} kg`
      : "Chưa rõ";

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition-all hover:border-line/80 hover:shadow-sm">
      <div>
        {/* Top Pet Image Banner */}
        <div className="relative h-48 w-full overflow-hidden bg-canvas">
          <Image
            src={imageSrc}
            alt={pet.name}
            width={480}
            height={270}
            unoptimized
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Card Body */}
        <div className="p-5">
          {/* Header row: Name + Species Badge */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-ink sm:text-xl">
              {pet.name}
            </h3>
            <span className="inline-flex shrink-0 items-center rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand">
              {speciesLabel}
            </span>
          </div>

          {/* Breed */}
          <p className="mt-1 text-xs font-medium text-muted">
            {pet.breed || (isDog ? "Golden Retriever" : "Mèo Anh lông ngắn")}
          </p>

          {/* Age & Weight Stats Row */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="text-muted">
              Tuổi: <strong className="font-semibold text-ink">{ageDisplay}</strong>
            </span>
            <span className="text-muted/60">·</span>
            <span className="text-muted">
              Cân nặng: <strong className="font-semibold text-ink">{weightDisplay}</strong>
            </span>
          </div>

          {/* Notes / Description */}
          {pet.notes ? (
            <p className="mt-3 text-xs text-muted leading-relaxed line-clamp-2">
              {pet.notes}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted/80 italic">
              {isDog
                ? "Thích gặm xương, chạy nhảy ngoài công viên..."
                : "Thích ăn hạt và nằm sưởi nắng bên cửa sổ..."}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Action Row */}
      <div className="flex items-center justify-between border-t border-line/60 px-5 py-3.5 bg-surface">
        <button
          type="button"
          onClick={() => onEdit(pet)}
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
          onClick={() => onDelete(pet._id)}
          className="text-xs font-semibold text-danger hover:underline"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}
