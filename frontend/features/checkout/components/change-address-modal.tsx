// =============================================================
// features/checkout/components/change-address-modal.tsx
// Modal quản lý và chọn địa chỉ giao hàng trong trang Checkout
// - Liệt kê các địa chỉ kèm radio chọn
// - Nút Sửa / Xóa cho từng địa chỉ
// - Nút "+ Thêm địa chỉ mới" chuyển sang form (trong cùng modal)
// - Sau khi lưu -> quay lại danh sách và tự chọn địa chỉ vừa tạo
// =============================================================

"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { accountApi } from "@/features/account/api";
import type {
  AddressFormValues,
  ShippingAddress,
} from "@/features/account/types";
import {
  getAllProvinces,
  getDistrictsByProvince,
  getWardsByDistrict,
} from "@/data/province";
import type { CheckoutAddress } from "../services/checkout.service";

interface ChangeAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAddressId?: string;
  onSelectAddress: (address: CheckoutAddress) => void;
  userEmail?: string;
}

function toCheckoutAddress(
  addr: ShippingAddress,
  userEmail = ""
): CheckoutAddress {
  return {
    _id: addr._id,
    recipientName: addr.recipientName,
    email: userEmail,
    phone: addr.phone,
    province: addr.province,
    district: addr.district,
    ward: addr.ward,
    street: addr.street,
    isDefault: addr.isDefault ?? false,
  };
}

export function ChangeAddressModal({
  isOpen,
  onClose,
  selectedAddressId,
  onSelectAddress,
  userEmail = "",
}: ChangeAddressModalProps) {
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string>(selectedAddressId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Form State
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(
    null
  );
  const [formRecipient, setFormRecipient] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formProvince, setFormProvince] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formWard, setFormWard] = useState("");
  const [formStreet, setFormStreet] = useState("");
  const [formAddressType, setFormAddressType] = useState<"home" | "office">(
    "home"
  );
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dropdown data
  const provinces = useMemo(() => getAllProvinces(), []);
  const districts = useMemo(() => {
    return formProvince ? getDistrictsByProvince(formProvince) : [];
  }, [formProvince]);
  const wards = useMemo(() => {
    return formProvince && formDistrict
      ? getWardsByDistrict(formProvince, formDistrict)
      : [];
  }, [formProvince, formDistrict]);

  // Tải danh sách địa chỉ khi modal mở
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadAddresses() {
      setIsLoading(true);
      setListError(null);
      try {
        const list = await accountApi.getAddresses();
        if (isMounted) {
          setAddresses(list);
          // Nếu chưa chọn hoặc selectedId không nằm trong list, chọn địa chỉ mặc định hoặc đầu tiên
          if (list.length > 0) {
            const hasMatch = list.some((a) => a._id === selectedAddressId);
            if (hasMatch && selectedAddressId) {
              setSelectedId(selectedAddressId);
            } else {
              const defaultAddr = list.find((a) => a.isDefault) || list[0];
              setSelectedId(defaultAddr._id);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setListError(
            err instanceof Error
              ? err.message
              : "Không thể tải danh sách địa chỉ."
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAddresses();
    setViewMode("list");
    setEditingAddress(null);

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedAddressId]);

  // Đóng modal bằng phím ESC (khi không trong trạng thái lưu)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving && !deletingId) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, deletingId, onClose]);

  // Khởi tạo form khi chuyển sang chế độ tạo mới hoặc sửa
  const openCreateForm = () => {
    setEditingAddress(null);
    setFormRecipient("");
    setFormPhone("");
    setFormProvince("");
    setFormDistrict("");
    setFormWard("");
    setFormStreet("");
    setFormAddressType("home");
    setFormIsDefault(addresses.length === 0);
    setFormErrors({});
    setFormError(null);
    setViewMode("form");
  };

  const openEditForm = (addr: ShippingAddress) => {
    setEditingAddress(addr);
    setFormRecipient(addr.recipientName || "");
    setFormPhone(addr.phone || "");
    setFormProvince(addr.province || "");
    setFormDistrict(addr.district || "");
    setFormWard(addr.ward || "");
    setFormStreet(addr.street || "");
    setFormAddressType(
      (addr.addressType as "home" | "office") || "home"
    );
    setFormIsDefault(Boolean(addr.isDefault));
    setFormErrors({});
    setFormError(null);
    setViewMode("form");
  };

  // Validate form
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formRecipient.trim() || formRecipient.trim().length < 2) {
      errs.recipientName = "Họ tên người nhận phải có ít nhất 2 ký tự.";
    }
    const cleanPhone = formPhone.replace(/[\s.-]/g, "");
    if (!cleanPhone) {
      errs.phone = "Vui lòng nhập số điện thoại liên hệ.";
    } else if (!/^[0-9+() -]{8,15}$/.test(cleanPhone)) {
      errs.phone = "Số điện thoại không hợp lệ (8 - 15 chữ số).";
    }
    if (!formProvince.trim()) {
      errs.province = "Vui lòng chọn Tỉnh / Thành phố.";
    }
    if (!formDistrict.trim()) {
      errs.district = "Vui lòng chọn Quận / Huyện.";
    }
    if (!formWard.trim()) {
      errs.ward = "Vui lòng chọn Phường / Xã.";
    }
    if (!formStreet.trim() || formStreet.trim().length < 3) {
      errs.street = "Vui lòng nhập số nhà, tên đường cụ thể.";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Xử lý lưu form (Thêm mới hoặc Cập nhật)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSaving) return;

    setIsSaving(true);
    setFormError(null);

    const payload: AddressFormValues = {
      recipientName: formRecipient.trim(),
      phone: formPhone.trim(),
      province: formProvince.trim(),
      district: formDistrict.trim(),
      ward: formWard.trim(),
      street: formStreet.trim(),
      addressType: formAddressType,
      isDefault: formIsDefault,
    };

    try {
      let savedAddr: ShippingAddress;
      if (editingAddress) {
        // Cập nhật
        savedAddr = await accountApi.updateAddress(editingAddress._id, payload);
      } else {
        // Tạo mới
        savedAddr = await accountApi.createAddress(payload);
      }

      // Tải lại danh sách mới nhất
      const updatedList = await accountApi.getAddresses();
      setAddresses(updatedList);

      // Tự động chọn địa chỉ vừa tạo/sửa
      setSelectedId(savedAddr._id);
      onSelectAddress(toCheckoutAddress(savedAddr, userEmail));

      // Quay lại danh sách
      setViewMode("list");
      setEditingAddress(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu địa chỉ."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Xử lý xóa địa chỉ
  const handleDeleteAddress = async (addrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;

    if (!window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này không?")) {
      return;
    }

    setDeletingId(addrId);
    try {
      await accountApi.deleteAddress(addrId);
      const remainingList = await accountApi.getAddresses();
      setAddresses(remainingList);

      // Nếu địa chỉ bị xóa đang được chọn -> chọn địa chỉ khác
      if (selectedId === addrId) {
        if (remainingList.length > 0) {
          const nextDefault =
            remainingList.find((a) => a.isDefault) || remainingList[0];
          setSelectedId(nextDefault._id);
          onSelectAddress(toCheckoutAddress(nextDefault, userEmail));
        } else {
          setSelectedId("");
        }
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Không thể xóa địa chỉ giao hàng."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Áp dụng địa chỉ đang chọn và đóng modal
  const handleConfirmSelection = () => {
    const chosen = addresses.find((a) => a._id === selectedId);
    if (chosen) {
      onSelectAddress(toCheckoutAddress(chosen, userEmail));
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-address-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* ============================================================== */}
        {/* VIEW 1: LIỆT KÊ CÁC ĐỊA CHỈ (RADIO CHỌN + NÚT SỬA/XÓA + NÚT +) */}
        {/* ============================================================== */}
        {viewMode === "list" ? (
          <>
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-line pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MapPin className="size-4" />
                </div>
                <div>
                  <h3
                    id="change-address-modal-title"
                    className="text-lg font-bold text-ink"
                  >
                    Địa chỉ nhận hàng
                  </h3>
                  <p className="text-xs text-muted">
                    Chọn địa chỉ bạn muốn giao hàng đến
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="rounded-full p-1.5 text-muted hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body: Danh sách địa chỉ (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 [scrollbar-width:thin]">
              {isLoading && (
                <div className="py-12 text-center text-sm text-muted">
                  <div className="inline-block size-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mr-2 align-middle" />
                  Đang tải danh sách địa chỉ...
                </div>
              )}

              {listError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 flex items-start gap-2.5"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{listError}</span>
                </div>
              )}

              {!isLoading && !listError && addresses.length === 0 && (
                <div className="py-10 text-center">
                  <div className="size-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <MapPin className="size-6" />
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    Chưa có địa chỉ nhận hàng nào
                  </p>
                  <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                    Thêm địa chỉ giao hàng để chúng tôi phục vụ bạn chu đáo nhất.
                  </p>
                </div>
              )}

              {!isLoading &&
                addresses.map((addr) => {
                  const isChecked = selectedId === addr._id;
                  const isDeletingThis = deletingId === addr._id;

                  return (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedId(addr._id)}
                      className={`relative flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                          : "border-line bg-surface hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Radio button chọn */}
                      <div className="pt-0.5 shrink-0">
                        <input
                          type="radio"
                          id={`radio-addr-${addr._id}`}
                          name="checkout-selected-address"
                          checked={isChecked}
                          onChange={() => setSelectedId(addr._id)}
                          className="size-4 text-blue-600 border-line focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      {/* Thông tin địa chỉ */}
                      <div className="flex-1 min-w-0 pr-16 sm:pr-20">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-ink">
                            {addr.recipientName}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-700">
                            {addr.phone}
                          </span>

                          {/* Nhãn mặc định */}
                          {addr.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Mặc định
                            </span>
                          )}

                          {/* Nhãn loại địa chỉ */}
                          {addr.addressType && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                              {addr.addressType === "home"
                                ? "Nhà riêng"
                                : "Văn phòng"}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {[addr.street, addr.ward, addr.district, addr.province]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>

                      {/* Nút Sửa / Xóa ở góc phải */}
                      <div className="absolute right-3 top-3 flex items-center gap-1">
                        {/* Nút Sửa */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(addr);
                          }}
                          aria-label="Sửa địa chỉ"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Sửa địa chỉ"
                        >
                          <Edit2 className="size-4" />
                        </button>

                        {/* Nút Xóa */}
                        <button
                          type="button"
                          disabled={isDeletingThis}
                          onClick={(e) => handleDeleteAddress(addr._id, e)}
                          aria-label="Xóa địa chỉ"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Xóa địa chỉ"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Nút + Thêm địa chỉ mới ở cuối modal */}
              <button
                type="button"
                onClick={openCreateForm}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-blue-300 bg-blue-50/30 text-xs sm:text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-500 transition-colors cursor-pointer mt-2"
              >
                <Plus className="size-4" />
                <span>Thêm địa chỉ nhận hàng mới</span>
              </button>
            </div>

            {/* Footer modal: Hủy & Xác nhận chọn */}
            <div className="border-t border-line pt-4 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-line bg-surface text-xs sm:text-sm font-semibold text-slate-700 hover:bg-canvas transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!selectedId || addresses.length === 0}
                onClick={handleConfirmSelection}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Giao đến địa chỉ này
              </button>
            </div>
          </>
        ) : (
          /* ============================================================== */
          /* VIEW 2: FORM THÊM MỚI / CHỈNH SỬA ĐỊA CHỈ (TRONG CÙNG MODAL)   */
          /* ============================================================== */
          <>
            {/* Header Form */}
            <div className="flex items-center justify-between border-b border-line pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
                  title="Quay lại danh sách"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <h3 className="text-lg font-bold text-ink">
                  {editingAddress
                    ? "Chỉnh sửa địa chỉ"
                    : "Thêm địa chỉ nhận hàng mới"}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="rounded-full p-1.5 text-muted hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Form Fields (Scrollable) */}
            <form
              onSubmit={handleSaveForm}
              className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 [scrollbar-width:thin]"
            >
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-700 flex items-start gap-2"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Dòng 1: Họ tên & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="modal-recipient-name"
                    className="block text-xs font-semibold text-ink"
                  >
                    Họ tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-recipient-name"
                    type="text"
                    disabled={isSaving}
                    value={formRecipient}
                    onChange={(e) => {
                      setFormRecipient(e.target.value);
                      if (formErrors.recipientName) {
                        setFormErrors((prev) => ({
                          ...prev,
                          recipientName: "",
                        }));
                      }
                    }}
                    placeholder="VD: Nguyễn Văn A"
                    className={`mt-1.5 block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-hidden transition-colors ${
                      formErrors.recipientName
                        ? "border-red-500 focus:border-red-500"
                        : "border-line focus:border-blue-600"
                    }`}
                  />
                  {formErrors.recipientName && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.recipientName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="modal-phone"
                    className="block text-xs font-semibold text-ink"
                  >
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-phone"
                    type="tel"
                    disabled={isSaving}
                    value={formPhone}
                    onChange={(e) => {
                      setFormPhone(e.target.value);
                      if (formErrors.phone) {
                        setFormErrors((prev) => ({ ...prev, phone: "" }));
                      }
                    }}
                    placeholder="VD: 0912345678"
                    className={`mt-1.5 block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-hidden transition-colors ${
                      formErrors.phone
                        ? "border-red-500 focus:border-red-500"
                        : "border-line focus:border-blue-600"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Dòng 2: Tỉnh / Quận / Phường */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tỉnh / Thành phố */}
                <div>
                  <label
                    htmlFor="modal-province"
                    className="block text-xs font-semibold text-ink"
                  >
                    Tỉnh / Thành phố <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      id="modal-province"
                      disabled={isSaving}
                      value={formProvince}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        setFormProvince(newProv);
                        setFormDistrict("");
                        setFormWard("");
                        setFormErrors((prev) => ({
                          ...prev,
                          province: "",
                          district: "",
                          ward: "",
                        }));
                      }}
                      className={`block w-full appearance-none rounded-xl border bg-surface px-3 py-2 text-xs sm:text-sm text-ink focus:outline-hidden transition-colors pr-7 ${
                        formErrors.province
                          ? "border-red-500 focus:border-red-500"
                          : "border-line focus:border-blue-600"
                      }`}
                    >
                      <option value="">-- Tỉnh / Thành --</option>
                      {provinces.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formErrors.province && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.province}
                    </p>
                  )}
                </div>

                {/* Quận / Huyện */}
                <div>
                  <label
                    htmlFor="modal-district"
                    className="block text-xs font-semibold text-ink"
                  >
                    Quận / Huyện <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      id="modal-district"
                      disabled={isSaving || !formProvince}
                      value={formDistrict}
                      onChange={(e) => {
                        const newDist = e.target.value;
                        setFormDistrict(newDist);
                        setFormWard("");
                        setFormErrors((prev) => ({
                          ...prev,
                          district: "",
                          ward: "",
                        }));
                      }}
                      className={`block w-full appearance-none rounded-xl border bg-surface px-3 py-2 text-xs sm:text-sm text-ink focus:outline-hidden transition-colors pr-7 disabled:bg-slate-50 disabled:text-muted disabled:cursor-not-allowed ${
                        formErrors.district
                          ? "border-red-500 focus:border-red-500"
                          : "border-line focus:border-blue-600"
                      }`}
                    >
                      <option value="">-- Quận / Huyện --</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formErrors.district && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.district}
                    </p>
                  )}
                </div>

                {/* Phường / Xã */}
                <div>
                  <label
                    htmlFor="modal-ward"
                    className="block text-xs font-semibold text-ink"
                  >
                    Phường / Xã <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      id="modal-ward"
                      disabled={isSaving || !formDistrict}
                      value={formWard}
                      onChange={(e) => {
                        setFormWard(e.target.value);
                        setFormErrors((prev) => ({ ...prev, ward: "" }));
                      }}
                      className={`block w-full appearance-none rounded-xl border bg-surface px-3 py-2 text-xs sm:text-sm text-ink focus:outline-hidden transition-colors pr-7 disabled:bg-slate-50 disabled:text-muted disabled:cursor-not-allowed ${
                        formErrors.ward
                          ? "border-red-500 focus:border-red-500"
                          : "border-line focus:border-blue-600"
                      }`}
                    >
                      <option value="">-- Phường / Xã --</option>
                      {wards.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formErrors.ward && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.ward}
                    </p>
                  )}
                </div>
              </div>

              {/* Dòng 3: Số nhà, tên đường cụ thể */}
              <div>
                <label
                  htmlFor="modal-street"
                  className="block text-xs font-semibold text-ink"
                >
                  Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-street"
                  type="text"
                  disabled={isSaving}
                  value={formStreet}
                  onChange={(e) => {
                    setFormStreet(e.target.value);
                    if (formErrors.street) {
                      setFormErrors((prev) => ({ ...prev, street: "" }));
                    }
                  }}
                  placeholder="VD: 123 Đường Lê Lợi, Phường Bến Nghé"
                  className={`mt-1.5 block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-hidden transition-colors ${
                    formErrors.street
                      ? "border-red-500 focus:border-red-500"
                      : "border-line focus:border-blue-600"
                  }`}
                />
                {formErrors.street && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.street}
                  </p>
                )}
              </div>

              {/* Dòng 4: Loại địa chỉ & Đặt làm mặc định */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-line/60">
                {/* Loại địa chỉ */}
                <div>
                  <span className="block text-xs font-semibold text-ink mb-1.5">
                    Loại địa chỉ:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormAddressType("home")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        formAddressType === "home"
                          ? "bg-blue-50 border-blue-600 text-blue-600"
                          : "border-line text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Nhà riêng
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormAddressType("office")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        formAddressType === "office"
                          ? "bg-blue-50 border-blue-600 text-blue-600"
                          : "border-line text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Văn phòng
                    </button>
                  </div>
                </div>

                {/* Checkbox Đặt làm mặc định */}
                <label className="flex items-center gap-2 cursor-pointer select-none self-start sm:self-center">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    disabled={isSaving}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="size-4 rounded-sm border-line text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-ink">
                    Đặt làm địa chỉ mặc định
                  </span>
                </label>
              </div>

              {/* Footer Form buttons */}
              <div className="border-t border-line pt-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setViewMode("list")}
                  className="px-4 py-2.5 rounded-xl border border-line bg-surface text-xs sm:text-sm font-semibold text-slate-700 hover:bg-canvas transition-colors cursor-pointer disabled:opacity-50"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="size-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu địa chỉ</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

