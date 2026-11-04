"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import type { PetProfile, PetFormValues } from "../types";

interface PetFormViewProps {
  petToEdit?: PetProfile | null;
  isSaving: boolean;
  onSave: (values: PetFormValues) => Promise<void>;
  onCancel: () => void;
}

export const DOG_BREEDS = [
  "Poodle",
  "Corgi",
  "Golden Retriever",
  "Labrador",
  "Husky",
  "Shiba Inu",
  "Phốc Sóc",
  "Chihuahua",
  "Beagle",
  "Bulldog",
  "Chó ta",
  "Khác (nhập tên giống)",
];

export const CAT_BREEDS = [
  "Mèo Anh lông ngắn",
  "Mèo Anh lông dài",
  "Mèo Ba Tư",
  "Mèo Munchkin",
  "Mèo Scottish Fold",
  "Mèo Bengal",
  "Mèo Ragdoll",
  "Mèo Siamese",
  "Mèo Maine Coon",
  "Mèo ta",
  "Khác (nhập tên giống)",
];

export const COMMON_HEALTH_ISSUES = [
  "Tiết niệu",
  "Viêm da",
  "Dị ứng thức ăn",
  "Tiêu hoá",
  "Béo phì",
  "Khớp xương",
  "Răng miệng",
  "Mắt",
  "Tim mạch",
  "Hô hấp",
];

function calculateAgeFromDob(dobStr: string): string {
  if (!dobStr) return "";
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return "";
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

export function PetFormView({
  petToEdit,
  isSaving,
  onSave,
  onCancel,
}: PetFormViewProps) {
  const [name, setName] = useState(petToEdit?.name ?? "");
  const [species, setSpecies] = useState<string>(() => {
    if (!petToEdit?.species) return "dog";
    const s = petToEdit.species.toLowerCase();
    if (s === "cat" || s === "mèo") return "cat";
    if (s === "other" || s === "khác") return "other";
    return "dog";
  });

  const availableBreeds = useMemo(() => {
    if (species === "cat") return CAT_BREEDS;
    if (species === "dog") return DOG_BREEDS;
    return ["Khác (nhập tên giống)"];
  }, [species]);

  const [selectedBreed, setSelectedBreed] = useState<string>(() => {
    if (!petToEdit?.breed) return "";
    const list =
      petToEdit.species === "cat" || petToEdit.species === "mèo"
        ? CAT_BREEDS
        : DOG_BREEDS;
    if (list.includes(petToEdit.breed)) {
      return petToEdit.breed;
    }
    return "Khác (nhập tên giống)";
  });

  const [customBreed, setCustomBreed] = useState<string>(() => {
    if (!petToEdit?.breed) return "";
    const list =
      petToEdit.species === "cat" || petToEdit.species === "mèo"
        ? CAT_BREEDS
        : DOG_BREEDS;
    return list.includes(petToEdit.breed) ? "" : petToEdit.breed;
  });

  const [dob, setDob] = useState(() => {
    if (!petToEdit?.dob) return "";
    const d = new Date(petToEdit.dob);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  });

  const [age, setAge] = useState(petToEdit?.age ?? "");
  const [weight, setWeight] = useState<string>(
    petToEdit?.weight !== undefined && petToEdit?.weight !== null
      ? String(petToEdit.weight)
      : "",
  );
  const [gender, setGender] = useState<string>(petToEdit?.gender ?? "");
  const [isSterilized, setIsSterilized] = useState<boolean>(
    petToEdit?.isSterilized ?? false,
  );
  const [healthIssues, setHealthIssues] = useState<string[]>(
    petToEdit?.healthIssues ?? [],
  );
  const [identification, setIdentification] = useState(
    petToEdit?.identification ?? "",
  );
  const [personality, setPersonality] = useState(
    petToEdit?.personality ?? "",
  );
  const [notes, setNotes] = useState(petToEdit?.notes ?? "");

  const defaultAvatar =
    species === "cat" ? "/images/pets/luna.jpg" : "/images/pets/milo.jpg";

  const [avatarUrl, setAvatarUrl] = useState<string>(
    petToEdit?.avatarUrl || defaultAvatar,
  );
  const [isNewAvatar, setIsNewAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    species?: string;
    breed?: string;
    weight?: string;
    gender?: string;
  }>({});
  const [apiError, setApiError] = useState("");

  function handleSpeciesChange(newSpecies: string) {
    setSpecies(newSpecies);
    setSelectedBreed("");
    setCustomBreed("");
    if (errors.species) {
      setErrors((prev) => ({ ...prev, species: undefined }));
    }
    if (errors.breed) {
      setErrors((prev) => ({ ...prev, breed: undefined }));
    }
    if (!petToEdit && !isNewAvatar) {
      setAvatarUrl(
        newSpecies === "cat" ? "/images/pets/luna.jpg" : "/images/pets/milo.jpg",
      );
    }
  }

  function toggleHealthIssue(issue: string) {
    setHealthIssues((prev) =>
      prev.includes(issue)
        ? prev.filter((item) => item !== issue)
        : [...prev, issue],
    );
  }

  function validate(): boolean {
    const nextErrors: {
      name?: string;
      species?: string;
      breed?: string;
      weight?: string;
      gender?: string;
    } = {};

    if (!name.trim()) {
      nextErrors.name = "Vui lòng nhập tên Boss.";
    } else if (name.trim().length > 50) {
      nextErrors.name = "Tên Boss tối đa 50 ký tự.";
    }

    if (!species.trim()) {
      nextErrors.species = "Vui lòng chọn loại thú cưng.";
    }

    let finalBreed = "";
    if (species === "other") {
      finalBreed = customBreed.trim();
    } else if (selectedBreed === "Khác (nhập tên giống)") {
      finalBreed = customBreed.trim();
    } else {
      finalBreed = selectedBreed.trim();
    }

    if (!finalBreed) {
      nextErrors.breed =
        selectedBreed === "Khác (nhập tên giống)" || species === "other"
          ? "Vui lòng nhập tên giống thú cưng."
          : "Vui lòng chọn hoặc nhập giống thú cưng.";
    }

    if (!weight.trim()) {
      nextErrors.weight = "Vui lòng nhập cân nặng của Boss.";
    } else {
      const numWeight = Number(weight.trim().replace(",", "."));
      if (isNaN(numWeight) || numWeight <= 0) {
        nextErrors.weight = "Cân nặng phải là số dương hợp lệ.";
      }
    }

    if (!gender.trim()) {
      nextErrors.gender = "Vui lòng chọn giới tính cho Boss.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setAvatarError("");
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Chỉ chấp nhận định dạng file hình ảnh (JPG, PNG).");
      return;
    }

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
        const MAX_DIM = 640;
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
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setApiError("");

    if (!validate()) return;

    const numWeight = weight.trim()
      ? Number(weight.trim().replace(",", "."))
      : undefined;

    let finalBreed = "";
    if (species === "other") {
      finalBreed = customBreed.trim() || selectedBreed.trim();
    } else if (selectedBreed === "Khác (nhập tên giống)") {
      finalBreed = customBreed.trim();
    } else {
      finalBreed = selectedBreed.trim();
    }

    const calculatedAge = dob ? calculateAgeFromDob(dob) : age.trim();

    try {
      await onSave({
        name: name.trim(),
        species,
        breed: finalBreed,
        dob: dob || undefined,
        age: calculatedAge || undefined,
        weight: numWeight,
        gender: gender.trim(),
        isSterilized,
        healthIssues,
        identification: identification.trim(),
        personality: personality.trim(),
        notes: notes.trim(),
        avatarUrl,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("Không thể lưu hồ sơ thú cưng. Vui lòng kiểm tra lại.");
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink sm:text-2xl">Boss</h1>
            <p className="mt-1 text-sm text-muted">
              Quản lý thông tin thú cưng của bạn
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 self-start rounded-xl border border-line bg-surface px-4 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-canvas sm:self-auto"
          >
            ← Quay lại danh sách
          </button>
        </div>

        {apiError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-danger/30 bg-danger-subtle p-4 text-xs font-semibold text-danger"
          >
            {apiError}
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <h2 className="text-base font-bold text-ink mb-6">
                {petToEdit ? `Chỉnh sửa thông tin ${petToEdit.name}` : "Thông tin Boss"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: Tên Boss & Loại thú cưng */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="pet-name"
                      className="block text-xs font-semibold text-ink"
                    >
                      Tên Boss <span className="text-danger">*</span>
                    </label>
                    <input
                      id="pet-name"
                      type="text"
                      required
                      disabled={isSaving}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) {
                          setErrors((prev) => ({ ...prev, name: undefined }));
                        }
                      }}
                      placeholder="Milu"
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">
                      Loại thú cưng <span className="text-danger">*</span>
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSpeciesChange("dog")}
                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all ${
                          species === "dog"
                            ? "bg-brand text-white shadow-xs"
                            : "border border-line bg-surface text-ink hover:bg-canvas"
                        }`}
                      >
                        <span className="text-base">🐕</span>
                        <span>Chó</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSpeciesChange("cat")}
                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all ${
                          species === "cat"
                            ? "bg-brand text-white shadow-xs"
                            : "border border-line bg-surface text-ink hover:bg-canvas"
                        }`}
                      >
                        <span className="text-base">🐱</span>
                        <span>Mèo</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSpeciesChange("other")}
                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all ${
                          species === "other"
                            ? "bg-brand text-white shadow-xs"
                            : "border border-line bg-surface text-ink hover:bg-canvas"
                        }`}
                      >
                        <span className="text-base">🐾</span>
                        <span>Khác</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Giống & Ngày sinh */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="pet-breed"
                      className="block text-xs font-semibold text-ink"
                    >
                      Giống <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="pet-breed"
                        disabled={isSaving}
                        value={selectedBreed}
                        onChange={(e) => {
                          setSelectedBreed(e.target.value);
                          if (errors.breed) {
                            setErrors((prev) => ({ ...prev, breed: undefined }));
                          }
                        }}
                        className="block w-full appearance-none min-h-11 rounded-xl border border-line bg-surface px-4 pr-10 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                      >
                        <option value="">Chọn giống...</option>
                        {availableBreeds.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-muted">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>

                    {(selectedBreed === "Khác (nhập tên giống)" ||
                      species === "other") && (
                      <input
                        type="text"
                        disabled={isSaving}
                        value={customBreed}
                        onChange={(e) => {
                          setCustomBreed(e.target.value);
                          if (errors.breed) {
                            setErrors((prev) => ({ ...prev, breed: undefined }));
                          }
                        }}
                        placeholder="Nhập tên giống..."
                        className="mt-2 block w-full min-h-10 rounded-xl border border-line bg-surface px-4 text-xs text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                      />
                    )}
                    {errors.breed && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.breed}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="pet-dob"
                      className="block text-xs font-semibold text-ink"
                    >
                      Ngày sinh
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="pet-dob"
                        type="date"
                        disabled={isSaving}
                        value={dob}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDob(val);
                          if (val) {
                            setAge(calculateAgeFromDob(val));
                          }
                        }}
                        className="block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Cân nặng & Giới tính */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="pet-weight"
                      className="block text-xs font-semibold text-ink"
                    >
                      Cân nặng (kg) <span className="text-danger">*</span>
                    </label>
                    <input
                      id="pet-weight"
                      type="text"
                      disabled={isSaving}
                      value={weight}
                      onChange={(e) => {
                        setWeight(e.target.value);
                        if (errors.weight) {
                          setErrors((prev) => ({ ...prev, weight: undefined }));
                        }
                      }}
                      placeholder="5.5"
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />
                    {errors.weight && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.weight}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="pet-gender"
                      className="block text-xs font-semibold text-ink"
                    >
                      Giới tính <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="pet-gender"
                        disabled={isSaving}
                        value={gender}
                        onChange={(e) => {
                          setGender(e.target.value);
                          if (errors.gender) {
                            setErrors((prev) => ({ ...prev, gender: undefined }));
                          }
                        }}
                        className="block w-full appearance-none min-h-11 rounded-xl border border-line bg-surface px-4 pr-10 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                      >
                        <option value="">Chọn giới tính...</option>
                        <option value="Đực">Đực</option>
                        <option value="Cái">Cái</option>
                        <option value="Không rõ">Không rõ</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-muted">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {errors.gender && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.gender}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 4: Triệt sản */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">
                    Triệt sản
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setIsSterilized(false)}
                      className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-5 text-xs font-semibold transition-all ${
                        isSterilized === false
                          ? "border-brand bg-brand-subtle text-brand ring-1 ring-brand"
                          : "border-line bg-surface text-ink hover:bg-canvas"
                      }`}
                    >
                      Chưa
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setIsSterilized(true)}
                      className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-5 text-xs font-semibold transition-all ${
                        isSterilized === true
                          ? "border-brand bg-brand-subtle text-brand ring-1 ring-brand"
                          : "border-line bg-surface text-ink hover:bg-canvas"
                      }`}
                    >
                      Rồi
                    </button>
                  </div>
                </div>

                {/* Row 5: Vấn đề sức khoẻ */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">
                    Vấn đề sức khoẻ
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COMMON_HEALTH_ISSUES.map((issue) => {
                      const selected = healthIssues.includes(issue);
                      return (
                        <button
                          key={issue}
                          type="button"
                          disabled={isSaving}
                          onClick={() => toggleHealthIssue(issue)}
                          className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs transition-all ${
                            selected
                              ? "border-brand bg-brand-subtle font-semibold text-brand ring-1 ring-brand shadow-2xs"
                              : "border-line bg-surface font-medium text-ink/80 hover:bg-canvas"
                          }`}
                        >
                          {issue}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 6: Đặc điểm nhận dạng */}
                <div>
                  <label
                    htmlFor="pet-identification"
                    className="block text-xs font-semibold text-ink"
                  >
                    Đặc điểm nhận dạng
                  </label>
                  <textarea
                    id="pet-identification"
                    rows={3}
                    disabled={isSaving}
                    value={identification}
                    onChange={(e) => setIdentification(e.target.value)}
                    placeholder="VD: Lông trắng, có đốm đen ở tai trái..."
                    className="mt-1.5 block w-full rounded-xl border border-line bg-surface p-3.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                  />
                </div>

                {/* Row 7: Tính cách */}
                <div>
                  <label
                    htmlFor="pet-personality"
                    className="block text-xs font-semibold text-ink"
                  >
                    Tính cách
                  </label>
                  <textarea
                    id="pet-personality"
                    rows={3}
                    disabled={isSaving}
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    placeholder="VD: Hiền lành, thích chơi bóng..."
                    className="mt-1.5 block w-full rounded-xl border border-line bg-surface p-3.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                  />
                </div>

                {/* Optional Notes */}
                <div>
                  <label
                    htmlFor="pet-notes"
                    className="block text-xs font-semibold text-ink"
                  >
                    Ghi chú thêm
                  </label>
                  <textarea
                    id="pet-notes"
                    rows={2}
                    disabled={isSaving}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Thói quen ăn uống, dị ứng khác hoặc lưu ý đặc biệt..."
                    className="mt-1.5 block w-full rounded-xl border border-line bg-surface p-3.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                  />
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-line/60">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? "Đang lưu…"
                      : petToEdit
                      ? "Lưu thay đổi"
                      : "Thêm Boss"}
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

          {/* Right Column: Pet Image & Tip */}
          <div className="space-y-6 lg:col-span-5 xl:col-span-4">
            {/* Image Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <h2 className="text-base font-bold text-ink mb-4">
                Ảnh của {name || "bé Boss"}
              </h2>

              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border-2 border-brand/20 bg-canvas shadow-sm">
                <Image
                  src={avatarUrl}
                  alt={name || "Pet"}
                  width={480}
                  height={270}
                  unoptimized
                  className="h-full w-full object-cover"
                />
                {isNewAvatar && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
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

              <div className="mt-4 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-canvas"
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
                  <span>Thay ảnh</span>
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

                <p className="mt-2 text-[11px] text-muted">
                  Định dạng: JPG, PNG · Tối đa 5MB
                </p>
              </div>
            </div>

            {/* Tip Box */}
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
                  Mẹo thông tin Boss
                </strong>
                <p className="text-muted text-xs leading-relaxed">
                  Cập nhật đầy đủ cân nặng, giống loài và tình trạng sức khỏe giúp
                  Petly cá nhân hóa đề xuất khẩu phần dinh dưỡng và sản phẩm chăm
                  sóc tốt nhất cho bé.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
