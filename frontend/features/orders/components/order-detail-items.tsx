"use client";

// Danh sách sản phẩm trong đơn & Địa chỉ nhận hàng

import Image from "next/image";
import React, { useState } from "react";
import type { OrderDetailProductItem } from "../types";

type OrderDetailItemsProps = {
  items: OrderDetailProductItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function OrderDetailItems({
  items,
  shippingAddress,
}: OrderDetailItemsProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      {/* Khối 1: Sản phẩm trong đơn */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-base font-bold text-ink mb-4">
          Sản phẩm trong đơn
        </h2>

        <div className="divide-y divide-line">
          {items.map((item) => (
            <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Ảnh sản phẩm */}
                <div className="relative w-16 h-16 rounded-xl border border-line bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {!imageErrors[item.id] ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain p-1.5"
                      onError={() =>
                        setImageErrors((prev) => ({ ...prev, [item.id]: true }))
                      }
                    />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>

                {/* Thông tin sản phẩm */}
                <div>
                  <h3 className="text-sm font-semibold text-ink">{item.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{item.description}</p>
                  <p className="text-xs text-muted mt-1 font-mono">
                    SKU: {item.sku} · {formatVND(item.price)} x {item.quantity}
                  </p>
                </div>
              </div>

              {/* Thành tiền */}
              <div className="text-right shrink-0">
                <span className="font-bold text-sm text-ink">
                  {formatVND(item.price * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Khối 2: Địa chỉ nhận hàng */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-base font-bold text-ink mb-2">
          Địa chỉ nhận hàng
        </h2>
        <p className="text-sm font-semibold text-ink">
          {shippingAddress.fullName} · {shippingAddress.phone}
        </p>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          {shippingAddress.address}
        </p>
      </div>
    </div>
  );
}
