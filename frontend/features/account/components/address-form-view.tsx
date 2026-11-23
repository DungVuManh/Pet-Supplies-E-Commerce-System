"use client";

import { useState, useMemo } from "react";
import type { ShippingAddress, AddressFormValues } from "../types";
import {
  getAllProvinces,
  getDistrictsByProvince,
  getWardsByDistrict,
} from "@/data/province";

interface AddressFormViewProps {
  addressToEdit?: ShippingAddress | null;
  isSaving: boolean;
  onSave: (values: AddressFormValues) => Promise<void>;
  onCancel: () => void;
}

export function AddressFormView({
  addressToEdit,
  isSaving,
  onSave,
  onCancel,
}: AddressFormViewProps) {
  const [recipientName, setRecipientName] = useState(
    addressToEdit?.recipientName ?? "",
  );
  const [phone, setPhone] = useState(addressToEdit?.phone ?? "");
  const [province, setProvince] = useState(
    addressToEdit?.province ?? "",
  );
  const [district, setDistrict] = useState(addressToEdit?.district ?? "");
  const [ward, setWard] = useState(addressToEdit?.ward ?? "");
  const [street, setStreet] = useState(addressToEdit?.street ?? "");
  const [addressType, setAddressType] = useState<"home" | "office">(
    (addressToEdit?.addressType as "home" | "office") ?? "home",
  );
  const [isDefault, setIsDefault] = useState(addressToEdit?.isDefault ?? false);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [apiError, setApiError] = useState("");

  const provinces = useMemo(() => getAllProvinces(), []);

  const districts = useMemo(() => {
    return province ? getDistrictsByProvince(province) : [];
  }, [province]);

  const wards = useMemo(() => {
    return province && district ? getWardsByDistrict(province, district) : [];
  }, [province, district]);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!recipientName.trim() || recipientName.trim().length < 2) {
      nextErrors.recipientName = "Họ tên người nhận phải có ít nhất 2 ký tự.";
    }

    const cleanPhone = phone.replace(/[\s.-]/g, "");
    if (!cleanPhone) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!/^(?:0|\+84)[0-9]{9}$/.test(cleanPhone)) {
      nextErrors.phone = "Số điện thoại Việt Nam không hợp lệ.";
    }

    if (!province.trim()) {
      nextErrors.province = "Vui lòng chọn Tỉnh / Thành phố.";
    }
    if (!district.trim()) {
      nextErrors.district = "Vui lòng chọn Quận / Huyện.";
    }
    if (!ward.trim()) {
      nextErrors.ward = "Vui lòng chọn Phường / Xã.";
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
        addressType,
        isDefault,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("Không thể lưu địa chỉ. Vui lòng kiểm tra lại thông tin.");
      }
    }
  }

  // Address line for live preview
  const liveAddressParts = [street, ward, district, province]
    .filter((part) => Boolean(part && part.trim()))
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
        <h1 className="text-xl font-bold text-ink sm:text-2xl">
          {addressToEdit ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cập nhật thông tin giao hàng để đơn hàng được chuyển đến chính xác
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
                Thông tin giao hàng
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: Recipient Name & Phone */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="addr-recipient"
                      className="block text-xs font-semibold text-ink"
                    >
                      Họ và tên người nhận <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addr-recipient"
                      type="text"
                      required
                      disabled={isSaving}
                      value={recipientName}
                      onChange={(e) => {
                        setRecipientName(e.target.value);
                        if (errors.recipientName) {
                          setErrors((prev) => ({ ...prev, recipientName: undefined }));
                        }
                      }}
                      placeholder="Nhập họ và tên người nhận"
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />
                    {errors.recipientName && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.recipientName}
                      </p>
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
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) {
                          setErrors((prev) => ({ ...prev, phone: undefined }));
                        }
                      }}
                      placeholder="Nhập số điện thoại nhận hàng"
                      className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 2: Province, District, Ward */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Province */}
                  <div>
                    <label
                      htmlFor="addr-province"
                      className="block text-xs font-semibold text-ink"
                    >
                      Tỉnh / Thành phố <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="addr-province"
                        disabled={isSaving}
                        value={province}
                        onChange={(e) => {
                          const nextProvince = e.target.value;
                          setProvince(nextProvince);
                          setDistrict("");
                          setWard("");
                          if (errors.province) {
                            setErrors((prev) => ({ ...prev, province: undefined }));
                          }
                        }}
                        className="block w-full appearance-none min-h-11 rounded-xl border border-line bg-surface px-4 pr-10 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted"
                      >
                        <option value="">-- Chọn Tỉnh / Thành phố --</option>
                        {province && !provinces.includes(province) && (
                          <option value={province}>{province}</option>
                        )}
                        {provinces.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-muted">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.province && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.province}
                      </p>
                    )}
                  </div>

                  {/* District */}
                  <div>
                    <label
                      htmlFor="addr-district"
                      className="block text-xs font-semibold text-ink"
                    >
                      Quận / Huyện <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="addr-district"
                        disabled={isSaving || !province}
                        value={district}
                        onChange={(e) => {
                          const nextDistrict = e.target.value;
                          setDistrict(nextDistrict);
                          setWard("");
                          if (errors.district) {
                            setErrors((prev) => ({ ...prev, district: undefined }));
                          }
                        }}
                        className="block w-full appearance-none min-h-11 rounded-xl border border-line bg-surface px-4 pr-10 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted"
                      >
                        <option value="">
                          {province ? "-- Chọn Quận / Huyện --" : "-- Chọn Tỉnh trước --"}
                        </option>
                        {district && !districts.includes(district) && (
                          <option value={district}>{district}</option>
                        )}
                        {districts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-muted">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.district && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.district}
                      </p>
                    )}
                  </div>

                  {/* Ward */}
                  <div>
                    <label
                      htmlFor="addr-ward"
                      className="block text-xs font-semibold text-ink"
                    >
                      Phường / Xã <span className="text-danger">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="addr-ward"
                        disabled={isSaving || !district}
                        value={ward}
                        onChange={(e) => {
                          const nextWard = e.target.value;
                          setWard(nextWard);
                          if (errors.ward) {
                            setErrors((prev) => ({ ...prev, ward: undefined }));
                          }
                        }}
                        className="block w-full appearance-none min-h-11 rounded-xl border border-line bg-surface px-4 pr-10 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted"
                      >
                        <option value="">
                          {district ? "-- Chọn Phường / Xã --" : "-- Chọn Quận/Huyện trước --"}
                        </option>
                        {ward && !wards.includes(ward) && (
                          <option value={ward}>{ward}</option>
                        )}
                        {wards.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-muted">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.ward && (
                      <p className="mt-1 text-xs text-danger font-medium">
                        {errors.ward}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 4: Street */}
                <div>
                  <label
                    htmlFor="addr-street"
                    className="block text-xs font-semibold text-ink"
                  >
                    Địa chỉ chi tiết <span className="text-danger">*</span>
                  </label>
                  <input
                    id="addr-street"
                    type="text"
                    required
                    disabled={isSaving}
                    value={street}
                    onChange={(e) => {
                      setStreet(e.target.value);
                      if (errors.street) {
                        setErrors((prev) => ({ ...prev, street: undefined }));
                      }
                    }}
                    placeholder="Số nhà, tên đường, tòa nhà..."
                    className="mt-1.5 block w-full min-h-11 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Ví dụ: Số 26, ngõ 12... hoặc số phòng nếu ở chung cư
                  </p>
                  {errors.street && (
                    <p className="mt-1 text-xs text-danger font-medium">
                      {errors.street}
                    </p>
                  )}
                </div>

                {/* Row 5: Address Type Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">
                    Loại địa chỉ
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAddressType("home")}
                      className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all ${
                        addressType === "home"
                          ? "border-brand bg-brand text-white shadow-xs"
                          : "border-line bg-surface text-ink hover:bg-canvas"
                      }`}
                    >
                      <span>🏠</span>
                      <span>Nhà riêng</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressType("office")}
                      className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all ${
                        addressType === "office"
                          ? "border-brand bg-brand text-white shadow-xs"
                          : "border-line bg-surface text-ink hover:bg-canvas"
                      }`}
                    >
                      <span>🏢</span>
                      <span>Văn phòng</span>
                    </button>
                  </div>
                </div>

                {/* Row 6: Default Checkbox */}
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
                      Đặt làm địa chỉ mặc định
                    </span>
                  </label>
                </div>

                {/* Row 7: Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-line/60">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? "Đang lưu…"
                      : addressToEdit
                      ? "Lưu thay đổi"
                      : "Thêm địa chỉ"}
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

          {/* Right Column: Live Preview & Tip */}
          <div className="space-y-6 lg:col-span-5 xl:col-span-4">
            <div>
              <h2 className="text-base font-bold text-ink mb-3">
                Xem trước địa chỉ
              </h2>

              {/* Real-time Preview Card */}
              <div className="rounded-2xl border border-brand/40 bg-surface p-6 shadow-xs">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-base">
                      {addressType === "office" ? "🏢" : "🏠"}
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {addressType === "office" ? "Văn phòng" : "Nhà riêng"}
                    </span>
                    {isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2.5 py-0.5 text-xs font-semibold text-brand">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        Mặc định
                      </span>
                    )}
                  </div>
                </div>

                {/* Recipient Line */}
                <div className="mt-3.5">
                  <p className="text-sm font-bold text-ink">
                    {recipientName || "Họ và tên người nhận"}{" "}
                    <span className="font-normal text-muted">·</span>{" "}
                    <span className="font-medium text-ink/80">
                      {phone || "Số điện thoại"}
                    </span>
                  </p>

                  <p className="mt-2 text-xs text-muted leading-relaxed">
                    {liveAddressParts || "Địa chỉ nhận hàng chi tiết..."}
                  </p>
                </div>
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
                  Mẹo: Điền chính xác số điện thoại
                </strong>
                <p className="text-muted text-xs leading-relaxed">
                  Shipper sẽ gọi trước khi giao hàng 15-30 phút. Vui lòng giữ máy trong khung giờ giao hàng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
