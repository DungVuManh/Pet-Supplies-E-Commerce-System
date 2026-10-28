"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { AccountShell } from "@/features/account/components/account-shell";
import { PetCard } from "@/features/account/components/pet-card";
import { PetFormView } from "@/features/account/components/pet-form-view";
import { ConfirmDialog } from "@/features/account/components/confirm-dialog";
import { accountApi } from "@/features/account/api";
import type { PetProfile, PetFormValues } from "@/features/account/types";

// Default demo pets matching the exact Figma designs
const INITIAL_DEMO_PETS: PetProfile[] = [
  {
    _id: "demo-pet-milo",
    name: "Milo",
    species: "dog",
    breed: "Golden Retriever",
    age: "2 tuổi",
    weight: 28,
    notes: "Thích gặm xương, dị ứng với thức ăn có hạt nhân...",
    avatarUrl: "/images/pets/milo.jpg",
  },
  {
    _id: "demo-pet-luna",
    name: "Luna",
    species: "cat",
    breed: "Mèo Anh lông ngắn",
    age: "1 tuổi",
    weight: 4.2,
    notes: "Rất thích ăn pate cá hồi, đã tiêm phòng dại đầy đủ",
    avatarUrl: "/images/pets/luna.jpg",
  },
];

export default function PetsPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  const [pets, setPets] = useState<PetProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Form View State (Screen 2)
  const [isFormView, setIsFormView] = useState(false);
  const [petToEdit, setPetToEdit] = useState<PetProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Dialog State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === "ready" && !user) {
      router.replace("/login?redirect=/account/pets");
    }
  }, [status, user, router]);

  async function loadPets() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await accountApi.getPets();
      if (data && data.length > 0) {
        setPets(data);
      } else {
        setPets(INITIAL_DEMO_PETS);
      }
    } catch {
      setPets(INITIAL_DEMO_PETS);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    accountApi
      .getPets()
      .then((data) => {
        if (active) {
          if (data && data.length > 0) {
            setPets(data);
          } else {
            setPets(INITIAL_DEMO_PETS);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setPets(INITIAL_DEMO_PETS);
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

  function handleOpenCreate() {
    setPetToEdit(null);
    setIsFormView(true);
  }

  function handleOpenEdit(pet: PetProfile) {
    setPetToEdit(pet);
    setIsFormView(true);
  }

  async function handleSave(values: PetFormValues) {
    setIsSaving(true);
    try {
      if (petToEdit && !petToEdit._id.startsWith("demo-")) {
        await accountApi.updatePet(petToEdit._id, values);
        setToastMessage("Đã cập nhật thông tin thú cưng.");
      } else if (petToEdit) {
        // Update local demo pet
        setPets((prev) =>
          prev.map((p) =>
            p._id === petToEdit._id
              ? {
                  ...p,
                  ...values,
                }
              : p,
          ),
        );
        setToastMessage("Đã cập nhật thông tin thú cưng.");
      } else {
        try {
          await accountApi.createPet(values);
        } catch {
          // If in demo mode, append locally
          setPets((prev) => [
            ...prev,
            {
              _id: `pet-${Date.now()}`,
              name: values.name,
              species: values.species,
              breed: values.breed,
              age: values.age,
              weight: values.weight,
              notes: values.notes,
              avatarUrl: values.avatarUrl,
            },
          ]);
        }
        setToastMessage("Đã thêm hồ sơ thú cưng thành công.");
      }
      setIsFormView(false);
      await loadPets();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      if (!deleteTargetId.startsWith("demo-")) {
        await accountApi.deletePet(deleteTargetId);
      } else {
        setPets((prev) => prev.filter((p) => p._id !== deleteTargetId));
      }
      setToastMessage("Đã xóa hồ sơ thú cưng.");
      setDeleteTargetId(null);
      await loadPets();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AccountShell activeTab="pets">
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

      {/* Main Switch: Screen 1 (List) vs Screen 2 (Form View) */}
      {isFormView ? (
        <PetFormView
          key={petToEdit?._id ?? "new"}
          petToEdit={petToEdit}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={() => setIsFormView(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-line/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-ink sm:text-2xl">
                  Thú cưng của tôi
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Lưu hồ sơ các bé cưng để nhận gợi ý phù hợp và ưu đãi riêng biệt
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover"
              >
                <span className="text-lg leading-none">+</span>
                <span>Thêm thú cưng</span>
              </button>
            </div>

            {/* Pet Cards List */}
            <div className="mt-6">
              {isLoading ? (
                <div className="py-12 text-center text-sm text-muted">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand border-r-transparent" />
                  <p className="mt-3">Đang tải hồ sơ thú cưng…</p>
                </div>
              ) : pets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-subtle text-2xl text-brand">
                    🐾
                  </div>
                  <h3 className="mt-4 text-base font-bold text-ink">
                    Chưa có thú cưng nào được đăng ký
                  </h3>
                  <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
                    Hãy cho Petly biết thêm về người bạn bốn chân của bạn để chúng tôi phục vụ tốt nhất.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-hover"
                  >
                    Thêm thú cưng đầu tiên
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {pets.map((pet) => (
                    <PetCard
                      key={pet._id}
                      pet={pet}
                      onEdit={handleOpenEdit}
                      onDelete={(id) => setDeleteTargetId(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Pet Care Tip Box */}
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
              <strong className="text-brand">Mẹo chăm sóc thú cưng:</strong> Cập nhật cân nặng và tình trạng sức khỏe định kỳ giúp Petly gợi ý khẩu phần ăn chính xác nhất cho bé.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Xóa hồ sơ thú cưng"
        description="Bạn có chắc chắn muốn xóa hồ sơ của bé cưng này? Hành động này không thể hoàn tác."
        confirmLabel="Xác nhận xóa"
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTargetId(null)}
      />
    </AccountShell>
  );
}
