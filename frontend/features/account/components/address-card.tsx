"use client";

import type { ShippingAddress } from "../types";

interface AddressCardProps {
  address: ShippingAddress;
  onEdit: (address: ShippingAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isSettingDefault?: boolean;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault = false,
}: AddressCardProps) {
  const isOffice = address.addressType === "office";

  // Build full address string
  const addressParts = [address.street, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all shadow-xs ${
        address.isDefault
          ? "border-brand/40 bg-surface"
          : "border-line bg-surface hover:border-line/80"
      }`}
    >
      <div>
        {/* Top Header: Icon + Type Badge + Default Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-base">
              {isOffice ? "🏢" : "🏠"}
            </span>
            <span className="text-sm font-semibold text-ink">
              {isOffice ? "Văn phòng" : "Nhà riêng"}
            </span>
            {address.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2.5 py-0.5 text-xs font-semibold text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Mặc định
              </span>
            )}
          </div>
        </div>

        {/* Recipient & Phone */}
        <div className="mt-3.5">
          <p className="text-sm font-bold text-ink sm:text-base">
            {address.recipientName}{" "}
            <span className="font-normal text-muted">·</span>{" "}
            <span className="font-medium text-ink/80">{address.phone}</span>
          </p>

          {/* Full Address */}
          <p className="mt-2 text-xs text-muted leading-relaxed sm:text-sm">
            {addressParts}
          </p>
        </div>
      </div>

      {/* Action Row */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3.5">
        <div>
          {!address.isDefault && (
            <button
              type="button"
              disabled={isSettingDefault}
              onClick={() => onSetDefault(address._id)}
              className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
            >
              {isSettingDefault ? "Đang xử lý…" : "Đặt làm mặc định"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onEdit(address)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Chỉnh sửa
          </button>
          <button
            type="button"
            onClick={() => onDelete(address._id)}
            className="text-xs font-semibold text-danger hover:underline"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
