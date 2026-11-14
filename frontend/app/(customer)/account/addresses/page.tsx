"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { AccountShell } from "@/features/account/components/account-shell";
import { AddressCard } from "@/features/account/components/address-card";
import { AddressFormView } from "@/features/account/components/address-form-view";
import { ConfirmDialog } from "@/features/account/components/confirm-dialog";
import { accountApi } from "@/features/account/api";
import type { ShippingAddress, AddressFormValues } from "@/features/account/types";

export default function AddressesPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Edit / Add Form View State (Screen 4)
  const [isFormView, setIsFormView] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<ShippingAddress | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Dialog State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set Default State
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready" && !user) {
      router.replace("/login?redirect=/account/addresses");
    }
  }, [status, user, router]);

  async function loadAddresses() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await accountApi.getAddresses();
      setAddresses(data || []);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách địa chỉ.",
      );
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    accountApi
      .getAddresses()
      .then((data) => {
        if (active) {
          setAddresses(data || []);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Không thể tải danh sách địa chỉ.",
          );
          setAddresses([]);
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
    setAddressToEdit(null);
    setIsFormView(true);
  }

  function handleOpenEdit(address: ShippingAddress) {
    setAddressToEdit(address);
    setIsFormView(true);
  }

  async function handleSave(values: AddressFormValues) {
    setIsSaving(true);
    setErrorMessage("");
    try {
      if (addressToEdit) {
        await accountApi.updateAddress(addressToEdit._id, values);
        setToastMessage("Đã cập nhật địa chỉ giao hàng.");
      } else {
        await accountApi.createAddress(values);
        setToastMessage("Đã thêm địa chỉ giao hàng mới.");
      }
      setIsFormView(false);
      await loadAddresses();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không thể lưu địa chỉ. Vui lòng thử lại sau.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await accountApi.deleteAddress(deleteTargetId);
      setToastMessage("Đã xóa địa chỉ giao hàng.");
      setDeleteTargetId(null);
      await loadAddresses();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSetDefault(id: string) {
    setSettingDefaultId(id);
    setErrorMessage("");
    try {
      await accountApi.setDefaultAddress(id);
      setToastMessage("Đã đặt làm địa chỉ mặc định.");
      await loadAddresses();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setSettingDefaultId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 xl:px-16">
      <AccountShell activeTab="addresses">
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

        {/* Main Switch: Screen 3 (List) vs Screen 4 (Form View) */}
        {isFormView ? (
          <AddressFormView
            key={addressToEdit?._id ?? "new"}
            addressToEdit={addressToEdit}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={() => setIsFormView(false)}
          />
        ) : (
          <div className="space-y-6">
            {/* Sổ địa chỉ Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
              {/* Header */}
              <div className="flex flex-col gap-4 border-b border-line/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-xl font-bold text-ink sm:text-2xl">
                    Sổ địa chỉ
                  </h1>
                  <p className="mt-1 text-sm text-muted">
                    Quản lý tối đa 5 địa chỉ để thanh toán nhanh hơn khi mua sắm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover"
                >
                  <span className="text-lg leading-none">+</span>
                  <span>Thêm địa chỉ mới</span>
                </button>
              </div>

              {/* Address Cards List */}
              <div className="mt-6">
                {isLoading ? (
                  <div className="py-12 text-center text-sm text-muted">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand border-r-transparent" />
                    <p className="mt-3">Đang tải danh sách địa chỉ…</p>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line p-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-subtle text-2xl text-brand">
                      📍
                    </div>
                    <h3 className="mt-4 text-base font-bold text-ink">
                      Chưa có địa chỉ nhận hàng nào
                    </h3>
                    <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
                      Thêm địa chỉ giao hàng để đặt hàng nhanh chóng và thuận tiện hơn.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-hover shadow-xs transition-colors"
                    >
                      Thêm địa chỉ đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <AddressCard
                        key={address._id}
                        address={address}
                        onEdit={handleOpenEdit}
                        onDelete={(id) => setDeleteTargetId(id)}
                        onSetDefault={handleSetDefault}
                        isSettingDefault={settingDefaultId === address._id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Delivery Notice Box */}
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
                <strong className="text-brand">Lưu ý giao hàng:</strong> Địa chỉ mặc định sẽ được tự động chọn khi bạn đặt hàng. Bạn có thể thay đổi địa chỉ nhận hàng tại bước thanh toán.
              </p>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={Boolean(deleteTargetId)}
          title="Xóa địa chỉ nhận hàng"
          description="Bạn có chắc chắn muốn xóa địa chỉ này? Hành động này không thể hoàn tác."
          confirmLabel="Xác nhận xóa"
          isPending={isDeleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTargetId(null)}
        />
      </AccountShell>
    </div>
  );
}
