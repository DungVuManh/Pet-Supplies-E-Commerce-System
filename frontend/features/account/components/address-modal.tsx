"use client";

import { useEffect, useState } from "react";
import type { ShippingAddress, AddressFormValues } from "../types";

interface AddressModalProps {
  isOpen: boolean;
  addressToEdit?: ShippingAddress | null;
  isSaving: boolean;
  onSave: (values: AddressFormValues) => Promise<void>;
  onClose: () => void;
}

function AddressModalDialog({
  addressToEdit,
  isSaving,
  onSave,
  onClose,
}: Omit<AddressModalProps, "isOpen">) {
  const [recipientName, setRecipientName] = useState(
    addressToEdit?.recipientName ?? "",
  );
  const [phone, setPhone] = useState(addressToEdit?.phone ?? "");
  const [province, setProvince] = useState(addressToEdit?.province ?? "");
  const [district, setDistrict] = useState(addressToEdit?.district ?? "");
  const [ward, setWard] = useState(addressToEdit?.ward ?? "");
  const [street, setStreet] = useState(addressToEdit?.street ?? "");
  const [isDefault, setIsDefault] = useState(addressToEdit?.isDefault ?? false);

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

    if (!recipientName.trim() || recipientName.trim().length < 2) {
      nextErrors.recipientName = "Họ tên người nhận phải có ít nhất 2 ký tự.";
    }

    const cleanPhone = phone.replace(/[\s.-]/g, "");
    if (!cleanPhone) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!/^(?:0|\+84)[0-9]{9}$/.test(cleanPhone)) {
      nextErrors.phone = "Số điện thoại không hợp lệ.";
    }

    if (!province.trim()) {
      nextErrors.province = "Vui lòng nhập Tỉnh / Thành phố.";
    }
    if (!district.trim()) {
      nextErrors.district = "Vui lòng nhập Quận / Huyện.";
    }
    if (!ward.trim()) {
      nextErrors.ward = "Vui lòng nhập Phường / Xã.";
    }
    if (!street.trim()) {
      nextErrors.street = "Vui lòng nhập số nhà, tên đường cụ thể.";
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
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        province: province.trim(),
        district: district.trim(),
        ward: ward.trim(),
        street: street.trim(),
        addressType: (addressToEdit?.addressType as "home" | "office") || "home",
        isDefault,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("Không thể lưu địa chỉ. Vui lòng kiểm tra lại thông tin.");
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
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
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h3 id="address-modal-title" className="text-lg font-bold text-ink">
            {addressToEdit ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ nhận hàng mới"}
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
          {/* Recipient Name & Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="addr-recipient"
                className="block text-xs font-semibold text-ink"
              >
                Họ tên người nhận <span className="text-danger">*</span>
              </label>
              <input
                id="addr-recipient"
                type="text"
                required
                disabled={isSaving}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
              />
              {errors.recipientName && (
                <p className="mt-1 text-xs text-danger">{errors.recipientName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="addr-phone"
                className="block text-xs font-semibold text-ink"
              >
                Số điện thoại <span className="text-danger">*</span>
              </label>
              <input
                id="addr-phone"
                type="tel"
                required
                disabled={isSaving}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
                className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-danger">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Province & District */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="addr-province"
                className="block text-xs font-semibold text-ink"
              >
                Tỉnh / Thành phố <span className="text-danger">*</span>
              </label>
              <input
                id="addr-province"
                type="text"
                required
                disabled={isSaving}
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="TP. Hồ Chí Minh"
                className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
              />
              {errors.province && (
                <p className="mt-1 text-xs text-danger">{errors.province}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="addr-district"
                className="block text-xs font-semibold text-ink"
              >
                Quận / Huyện <span className="text-danger">*</span>
              </label>
              <input
                id="addr-district"
                type="text"
                required
                disabled={isSaving}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Quận 1"
                className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
              />
              {errors.district && (
                <p className="mt-1 text-xs text-danger">{errors.district}</p>
              )}
            </div>
          </div>

          {/* Ward */}
          <div>
            <label
              htmlFor="addr-ward"
              className="block text-xs font-semibold text-ink"
            >
              Phường / Xã <span className="text-danger">*</span>
            </label>
            <input
              id="addr-ward"
              type="text"
              required
              disabled={isSaving}
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="Phường Bến Nghé"
              className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
            />
            {errors.ward && (
              <p className="mt-1 text-xs text-danger">{errors.ward}</p>
            )}
          </div>

          {/* Street Address */}
          <div>
            <label
              htmlFor="addr-street"
              className="block text-xs font-semibold text-ink"
            >
              Địa chỉ chi tiết (số nhà, tên đường){" "}
              <span className="text-danger">*</span>
            </label>
            <input
              id="addr-street"
              type="text"
              required
              disabled={isSaving}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="123 Đường Nguyễn Du"
              className="mt-1.5 block w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
            />
            {errors.street && (
              <p className="mt-1 text-xs text-danger">{errors.street}</p>
            )}
          </div>

          {/* Default Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDefault}
                disabled={isSaving}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded-sm border-line text-brand focus:ring-brand"
              />
              <span className="text-xs font-medium text-ink">
                Đặt làm địa chỉ giao hàng mặc định
              </span>
            </label>
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
              {isSaving ? "Đang lưu…" : "Lưu địa chỉ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddressModal(props: AddressModalProps) {
  if (!props.isOpen) return null;
  return (
    <AddressModalDialog
      key={props.addressToEdit?._id ?? "new"}
      addressToEdit={props.addressToEdit}
      isSaving={props.isSaving}
      onSave={props.onSave}
      onClose={props.onClose}
    />
  );
}
