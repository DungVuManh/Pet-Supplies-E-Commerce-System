"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { PetProfile, PetFormValues } from "../types";

interface PetFormViewProps {
  petToEdit?: PetProfile | null;
  isSaving: boolean;
  onSave: (values: PetFormValues) => Promise<void>;
  onCancel: () => void;
}

export function PetFormView({
  petToEdit,
  isSaving,
  onSave,
  onCancel,
}: PetFormViewProps) {
  const [name, setName] = useState(petToEdit?.name ?? "");
  const [species, setSpecies] = useState<string>(
    petToEdit?.species === "cat" || petToEdit?.species === "mèo" ? "cat" : "dog",
  );
  const [breed, setBreed] = useState(petToEdit?.breed ?? "");
  const [age, setAge] = useState(
    petToEdit?.age ?? (petToEdit?.species === "cat" ? "1 tuổi" : "2 tuổi"),
  );
  const [weight, setWeight] = useState<string>(
    petToEdit?.weight !== undefined && petToEdit?.weight !== null
      ? String(petToEdit.weight)
      : petToEdit?.species === "cat"
      ? "4.2"
      : "28",
  );
  const [notes, setNotes] = useState(
    petToEdit?.notes ??
      (petToEdit?.species === "cat"
        ? "Rất thích ăn pate cá hồi, đã tiêm phòng dại đầy đủ"
        : "Thích gặm xương, dị ứng với thức ăn có hạt nhân..."),
  );

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
    weight?: string;
  }>({});
  const [apiError, setApiError] = useState("");

  function validate(): boolean {
    const nextErrors: { name?: string; species?: string; weight?: string } = {};

    if (!name.trim()) {
      nextErrors.name = "Vui lòng nhập tên thú cưng.";
    } else if (name.trim().length > 50) {
      nextErrors.name = "Tên thú cưng tối đa 50 ký tự.";
    }

    if (weight.trim()) {
      const numWeight = Number(weight.trim().replace(",", "."));
      if (isNaN(numWeight) || numWeight <= 0) {
        nextErrors.weight = "Cân nặng phải là số dương hợp lệ.";
      }
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

    try {
      await onSave({
        name: name.trim(),
        species,
        breed: breed.trim(),
        age: age.trim(),
        weight: numWeight,
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
        <h1 className="text-xl font-bold text-ink sm:text-2xl">
          {petToEdit ? `Chỉnh sửa hồ sơ ${petToEdit.name}` : "Thêm thú cưng mới"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Thông tin giúp Petly gợi ý sản phẩm và dịch vụ phù hợp nhất
        </p>

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
                Thông tin thú cưng
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Pet Name */}
                <div>
                  <label
                    htmlFor="pet-name"
                    className="block text-xs font-semibold text-ink"
                  >
                    Tên thú cưng <span className="text-danger">*</span>
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
                    placeholder="Ví dụ: Milo, Luna, Bông..."
                    className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-danger font-medium">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Species & Breed */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="pet-species"
                      className="block text-xs font-semibold text-ink"
                    >
                      Loài <span className="text-danger">*</span>
                    </label>
                    <select
                      id="pet-species"
                      disabled={isSaving}
                      value={species}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSpecies(val);
                        if (!petToEdit && !isNewAvatar) {
                          setAvatarUrl(
                            val === "cat"
                              ? "/images/pets/luna.jpg"
                              : "/images/pets/milo.jpg",
                          );
                        }
                      }}
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    >
                      <option value="dog">Chó</option>
                      <option value="cat">Mèo</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="pet-breed"
                      className="block text-xs font-semibold text-ink"
                    >
                      Giống loài
                    </label>
                    <input
                      id="pet-breed"
                      type="text"
                      disabled={isSaving}
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder="Ví dụ: Golden Retriever, Mèo Anh lông ngắn..."
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>

                {/* Age & Weight */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="pet-age"
                      className="block text-xs font-semibold text-ink"
                    >
                      Tuổi
                    </label>
                    <input
                      id="pet-age"
                      type="text"
                      disabled={isSaving}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Ví dụ: 2 tuổi, 8 tháng..."
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pet-weight"
                      className="block text-xs font-semibold text-ink"
                    >
                      Cân nặng (kg)
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
                      placeholder="Ví dụ: 28 hoặc 4.2"
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />
                    {errors.weight && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.weight}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label
                    htmlFor="pet-notes"
                    className="block text-xs font-semibold text-ink"
                  >
                    Ghi chú
                  </label>
                  <textarea
                    id="pet-notes"
                    rows={3}
                    disabled={isSaving}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ví dụ: Thói quen gặm xương, dị ứng với thức ăn có hạt nhân..."
                    className="mt-1.5 block w-full rounded-xl border border-line bg-surface p-3.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Thông tin giúp Petly gợi ý khẩu phần ăn và phụ kiện an toàn
                  </p>
                </div>

                {/* Buttons */}
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
                      : "Thêm thú cưng"}
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
                Ảnh của {name || "bé cưng"}
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
                  Định dạng: JPG, PNG · Tối đa 2MB
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
                  Mẹo chụp ảnh thú cưng
                </strong>
                <p className="text-muted text-xs leading-relaxed">
                  Nên chụp ở nơi đủ sáng, ngang tầm mắt của bé để có bức ảnh đẹp và nhận diện tốt nhất.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
