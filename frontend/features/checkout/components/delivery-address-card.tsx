"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { CheckoutAddress } from "../services/checkout.service";
import {
  getAllProvinces,
  getDistrictsByProvince,
  getWardsByDistrict,
} from "@/data/province";
import { ChangeAddressModal } from "./change-address-modal";

type DeliveryAddressCardProps = {
  address: CheckoutAddress;
  isGuest?: boolean;
  onAddressChange?: (field: keyof CheckoutAddress, value: string) => void;
  onSelectAddress?: (address: CheckoutAddress) => void;
  addressErrors?: Record<string, string>;
  onChangeClick?: () => void;
};

export function DeliveryAddressCard({
  address,
  isGuest = false,
  onAddressChange,
  onSelectAddress,
  addressErrors = {},
  onChangeClick,
}: DeliveryAddressCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Danh sách Tỉnh / Thành phố
  const provinces = useMemo(() => getAllProvinces(), []);

  // Danh sách Quận / Huyện phụ thuộc vào Tỉnh đã chọn
  const districts = useMemo(() => {
    return address.province ? getDistrictsByProvince(address.province) : [];
  }, [address.province]);

  // Danh sách Phường / Xã phụ thuộc vào Tỉnh & Quận đã chọn
  const wards = useMemo(() => {
    return address.province && address.district
      ? getWardsByDistrict(address.province, address.district)
      : [];
  }, [address.province, address.district]);

  // Nếu là user đã đăng nhập và đã có địa chỉ được chọn
  const hasSavedAddress = !isGuest && Boolean(address.recipientName?.trim());

  const handleOpenModal = () => {
    if (onChangeClick) {
      onChangeClick();
    } else {
      setIsModalOpen(true);
    }
  };

  const handleSelectAddressInternal = (newAddr: CheckoutAddress) => {
    if (onSelectAddress) {
      onSelectAddress(newAddr);
    } else if (onAddressChange) {
      Object.entries(newAddr).forEach(([key, val]) => {
        onAddressChange(key as keyof CheckoutAddress, String(val ?? ""));
      });
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-ink">1. Địa chỉ giao hàng</h2>
        {isGuest && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/80">
            Khách mua hàng
          </span>
        )}
      </div>

      {!isGuest ? (
        hasSavedAddress ? (
          // Đã đăng nhập và có địa chỉ được chọn: Hiện địa chỉ + nút Thay đổi
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="size-8 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>

              <div>
                <p className="font-semibold text-sm text-ink">
                  {address.recipientName} · {address.phone}
                  {address.email && (
                    <span className="text-muted font-normal ml-2">({address.email})</span>
                  )}
                </p>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  {[address.street, address.ward, address.district, address.province]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenModal}
              className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors pt-0.5 cursor-pointer"
            >
              Thay đổi
            </button>
          </div>
        ) : (
          // Đã đăng nhập nhưng chưa có địa chỉ nào trong danh bạ
          <div className="rounded-xl border border-dashed border-line bg-canvas/40 p-6 text-center">
            <p className="text-sm text-muted mb-3">
              Bạn chưa có địa chỉ nhận hàng nào được lưu.
            </p>
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Thêm địa chỉ nhận hàng</span>
            </button>
          </div>
        )
      ) : (
        // Guest chưa đăng nhập -> FORM NHẬP ĐỊA CHỈ THỦ CÔNG
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-blue-600"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                Bạn chưa đăng nhập. Vui lòng nhập địa chỉ để chúng tôi giao hàng đến tận tay bạn.
              </span>
            </div>
            <Link
              href="/login"
              className="shrink-0 font-semibold text-blue-600 hover:underline"
            >
              Đăng nhập
            </Link>
          </div>

          {/* Dòng 1: Họ tên, Số điện thoại, Email */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Họ và tên người nhận */}
            <div>
              <label
                htmlFor="checkout-recipient-name"
                className="block text-xs font-semibold text-ink"
              >
                Họ và tên người nhận <span className="text-red-500">*</span>
              </label>
              <input
                id="checkout-recipient-name"
                type="text"
                value={address.recipientName}
                onChange={(e) => onAddressChange?.("recipientName", e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className={`mt-1.5 block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-hidden transition-colors ${
                  addressErrors.recipientName
                    ? "border-red-500 focus:border-red-500"
                    : "border-line focus:border-blue-600"
                }`}
              />
              {addressErrors.recipientName && (
                <p className="mt-1 text-xs text-red-600">{addressErrors.recipientName}</p>
              )}
            </div>

            {/* Số điện thoại */}
            <div>
              <label
                htmlFor="checkout-phone"
                className="block text-xs font-semibold text-ink"
              >
                Số điện thoại liên hệ <span className="text-red-500">*</span>
              </label>
              <input
                id="checkout-phone"
                type="tel"
                value={address.phone}
                onChange={(e) => onAddressChange?.("phone", e.target.value)}
                placeholder="VD: 0912345678"
                className={`mt-1.5 block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-hidden transition-colors ${
                  addressErrors.phone
                    ? "border-red-500 focus:border-red-500"
                    : "border-line focus:border-blue-600"
                }`}
              />
              {addressErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{addressErrors.phone}</p>
              )}
            </div>

            {/* Email (Optional) */}
            <div>
              <label
                htmlFor="checkout-recipient-email"
                className="block text-xs font-semibold text-ink"
              >
                Email (nhận mã đơn) <span className="text-muted font-normal">(tùy chọn)</span>
              </label>
              <input
                id="checkout-recipient-email"
                type="email"
                value={address.email}
                onChange={(e) => onAddressChange?.("email", e.target.value)}
                placeholder="VD: email@example.com"
                className={`mt-1.5 block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-hidden transition-colors ${
                  addressErrors.email
                    ? "border-red-500 focus:border-red-500"
                    : "border-line focus:border-blue-600"
                }`}
              />
              {addressErrors.email && (
                <p className="mt-1 text-xs text-red-600">{addressErrors.email}</p>
              )}
            </div>
          </div>

          {/* Dòng 2: Tỉnh / Thành phố, Quận / Huyện, Phường / Xã */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Tỉnh / Thành phố */}
            <div>
              <label
                htmlFor="checkout-province"
                className="block text-xs font-semibold text-ink"
              >
                Tỉnh / Thành phố <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  id="checkout-province"
                  value={address.province}
                  onChange={(e) => {
                    const newProv = e.target.value;
                    onAddressChange?.("province", newProv);
                    onAddressChange?.("district", "");
                    onAddressChange?.("ward", "");
                  }}
                  className={`block w-full appearance-none rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-hidden transition-colors pr-8 ${
                    addressErrors.province
                      ? "border-red-500 focus:border-red-500"
                      : "border-line focus:border-blue-600"
                  }`}
                >
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {addressErrors.province && (
                <p className="mt-1 text-xs text-red-600">{addressErrors.province}</p>
              )}
            </div>

            {/* Quận / Huyện */}
            <div>
              <label
                htmlFor="checkout-district"
                className="block text-xs font-semibold text-ink"
              >
                Quận / Huyện <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  id="checkout-district"
                  disabled={!address.province}
                  value={address.district}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    onAddressChange?.("district", newDist);
                    onAddressChange?.("ward", "");
                  }}
                  className={`block w-full appearance-none rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-hidden transition-colors pr-8 disabled:bg-gray-50 disabled:text-muted disabled:cursor-not-allowed ${
                    addressErrors.district
                      ? "border-red-500 focus:border-red-500"
                      : "border-line focus:border-blue-600"
                  }`}
                >
                  <option value="">
                    {address.province ? "-- Chọn Quận / Huyện --" : "-- Vui lòng chọn Tỉnh trước --"}
                  </option>
                  {districts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {addressErrors.district && (
                <p className="mt-1 text-xs text-red-600">{addressErrors.district}</p>
              )}
            </div>

            {/* Phường / Xã */}
            <div>
              <label
                htmlFor="checkout-ward"
                className="block text-xs font-semibold text-ink"
              >
                Phường / Xã <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  id="checkout-ward"
                  disabled={!address.district}
                  value={address.ward}
                  onChange={(e) => onAddressChange?.("ward", e.target.value)}
                  className={`block w-full appearance-none rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-hidden transition-colors pr-8 disabled:bg-gray-50 disabled:text-muted disabled:cursor-not-allowed ${
                    addressErrors.ward
                      ? "border-red-500 focus:border-red-500"
                      : "border-line focus:border-blue-600"
                  }`}
                >
                  <option value="">
                    {address.district ? "-- Chọn Phường / Xã --" : "-- Vui lòng chọn Quận/Huyện trước --"}
                  </option>
                  {wards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {addressErrors.ward && (
                <p className="mt-1 text-xs text-red-600">{addressErrors.ward}</p>
              )}
            </div>
          </div>

          {/* Dòng 3: Địa chỉ chi tiết */}
          <div>
            <label
              htmlFor="checkout-street"
              className="block text-xs font-semibold text-ink"
            >
              Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) <span className="text-red-500">*</span>
            </label>
            <input
              id="checkout-street"
              type="text"
              value={address.street}
              onChange={(e) => onAddressChange?.("street", e.target.value)}
              placeholder="VD: Số 123 đường Lê Lợi"
              className={`mt-1.5 block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-hidden transition-colors ${
                addressErrors.street
                  ? "border-red-500 focus:border-red-500"
                  : "border-line focus:border-blue-600"
              }`}
            />
            {addressErrors.street && (
              <p className="mt-1 text-xs text-red-600">{addressErrors.street}</p>
            )}
          </div>
        </div>
      )}

      {/* Modal Thay đổi & Quản lý địa chỉ giao hàng khi đã đăng nhập */}
      {!isGuest && (
        <ChangeAddressModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedAddressId={address._id}
          userEmail={address.email}
          onSelectAddress={handleSelectAddressInternal}
        />
      )}
    </div>
  );
}
