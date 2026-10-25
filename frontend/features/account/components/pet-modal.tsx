"use client";

import { useEffect, useState } from "react";
import type { PetProfile, PetFormValues } from "../types";

interface PetModalProps {
  isOpen: boolean;
  petToEdit?: PetProfile | null;
  isSaving: boolean;
  onSave: (values: PetFormValues) => Promise<void>;
  onClose: () => void;
}

function PetModalDialog({
  petToEdit,
  isSaving,
  onSave,
  onClose,
}: Omit<PetModalProps, "isOpen">) {
  const [name, setName] = useState(petToEdit?.name ?? "");
  const [species, setSpecies] = useState<"dog" | "cat">(
    petToEdit?.species === "cat" ? "cat" : "dog",
  );
  const [breed, setBreed] = useState(petToEdit?.breed ?? "");
  const [dob, setDob] = useState(() => {
    if (!petToEdit?.dob) return "";
    const d = new Date(petToEdit.dob);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isSaving, onClose]);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = "Vui lòng nhập tên thú cưng của bạn.";
    } else if (name.trim().length > 50) {
      nextErrors.name = "Tên thú cưng tối đa 50 ký tự.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setApiError("");

    if (!validate()) return;

    try {
      await onSave({
        name: name.trim(),
        species,
        breed: breed.trim(),
        dob,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("Không thể lưu hồ sơ thú cưng. Vui lòng kiểm tra lại.");
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h3 id="pet-modal-title" className="text-lg font-bold text-ink">
            {petToEdit ? "Chỉnh sửa thú cưng" : "Thêm thú cưng mới"}
          </h3>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {apiError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-danger/30 bg-danger-subtle p-3 text-xs font-semibold text-danger"
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Species Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink">
              Loại thú cưng <span className="text-danger">*</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setSpecies("dog")}
                className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-sm font-semibold transition-all ${
                  species === "dog"
                    ? "border-brand bg-brand-subtle text-brand ring-1 ring-brand"
                    : "border-line bg-surface text-ink hover:bg-canvas"
                }`}
              >
                <span className="text-xl">🐶</span>
                <span>Chó cưng</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => setSpecies("cat")}
                className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-sm font-semibold transition-all ${
                  species === "cat"
                    ? "border-brand bg-brand-subtle text-brand ring-1 ring-brand"
                    : "border-line bg-surface text-ink hover:bg-canvas"
                }`}
              >
                <span className="text-xl">🐱</span>
                <span>Mèo cưng</span>
              </button>
            </div>
          </div>

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
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Milo, Luna, Bông..."
              className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name}</p>
            )}
          </div>

          {/* Breed */}
          <div>
            <label
              htmlFor="pet-breed"
              className="block text-xs font-semibold text-ink"
            >
              Giống loài (tùy chọn)
            </label>
            <input
              id="pet-breed"
              type="text"
              disabled={isSaving}
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="Ví dụ: Poodle, Golden, Mèo Anh lông ngắn..."
              className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label
              htmlFor="pet-dob"
              className="block text-xs font-semibold text-ink"
            >
              Ngày sinh (tùy chọn)
            </label>
            <input
              id="pet-dob"
              type="date"
              disabled={isSaving}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-brand focus:outline-hidden"
            />
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="mt-6 flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end border-t border-line/60">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {isSaving ? "Đang lưu…" : "Lưu thú cưng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PetModal(props: PetModalProps) {
  if (!props.isOpen) return null;
  return (
    <PetModalDialog
      key={props.petToEdit?._id ?? "new"}
      petToEdit={props.petToEdit}
      isSaving={props.isSaving}
      onSave={props.onSave}
      onClose={props.onClose}
    />
  );
}
