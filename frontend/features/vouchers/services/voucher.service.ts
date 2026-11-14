// =============================================================
// features/vouchers/services/voucher.service.ts
// Service xử lý và chuyển đổi dữ liệu Promotion Model từ Backend
// =============================================================

import type { PromotionModel, VoucherItem, VoucherType } from "../types";

/**
 * Định dạng tiền tệ VND (vd: 30000 -> 30.000đ)
 */
export function formatVND(value: number): string {
  return (value || 0).toLocaleString("vi-VN") + "đ";
}

/**
 * Định dạng ngày kết thúc khuyến mãi (HSD DD/MM/YYYY)
 */
export function formatExpiry(endAtStr?: string): string {
  if (!endAtStr) return "Không giới hạn";
  try {
    const d = new Date(endAtStr);
    if (isNaN(d.getTime())) return "Không giới hạn";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `HSD ${day}/${month}/${year}`;
  } catch {
    return "Không giới hạn";
  }
}

/**
 * Chuyển đổi dữ liệu từ Promotion Model trong MongoDB sang VoucherItem hiển thị trên Card
 * 
 * Logic phân loại:
 * - "type": "percent" -> Giảm giá theo % (vd value=10 -> "10% GIẢM"), hỗ trợ maxDiscount (vd: tối đa 50.000đ).
 * - "type": "fixed"   -> Giảm giá theo số tiền cố định (vd value=30000 -> "30.000đ GIẢM" hoặc "30.000đ SHIP"),
 *                        yêu cầu đơn hàng tối thiểu đạt minOrderAmount (vd minOrderAmount=500000 -> "Từ 500.000đ").
 */
export function promotionToVoucherItem(promo: PromotionModel): VoucherItem {
  const isPercent = promo.type === "percent";
  const codeUpper = (promo.code || "").toUpperCase();
  const isShip = codeUpper.includes("SHIP");

  // 1. Giá trị hiển thị lớn trên thẻ
  const valueDisplay = isPercent ? `${promo.value}%` : formatVND(promo.value);

  // 2. Nhãn bên cạnh giá trị (GIẢM hoặc SHIP)
  const valueLabel: "GIẢM" | "SHIP" = isShip ? "SHIP" : "GIẢM";

  // 3. Phụ đề tối đa (nếu có maxDiscount)
  const maxDiscountDisplay = promo.maxDiscount ? `tối đa ${formatVND(promo.maxDiscount)}` : null;

  // 4. Điều kiện đơn tối thiểu (minOrderAmount)
  const minOrderDisplay = promo.minOrderAmount > 0 ? `Từ ${formatVND(promo.minOrderAmount)}` : "Từ 0đ";

  // 5. Tiêu đề khuyến mãi (title)
  let title = promo.name;
  if (!title) {
    if (isPercent) {
      title = promo.minOrderAmount > 0
        ? `Giảm ${promo.value}% cho đơn từ ${formatVND(promo.minOrderAmount)}`
        : `Giảm ${promo.value}% cho mọi đơn hàng`;
    } else {
      title = promo.minOrderAmount > 0
        ? `Giảm ${formatVND(promo.value)} cho đơn từ ${formatVND(promo.minOrderAmount)}`
        : `Giảm ${formatVND(promo.value)} cho mọi đơn hàng`;
    }
  }

  // 6. Phân loại nhóm thẻ (TOÀN SÀN, PHÍ SHIP, SẢN PHẨM)
  let type: VoucherType = "TOÀN SÀN";
  if (isShip) {
    type = "PHÍ SHIP";
  } else if (codeUpper.includes("SNACK") || codeUpper.includes("TOY") || codeUpper.includes("FOOD")) {
    type = "SẢN PHẨM";
  }

  return {
    id: promo._id || promo.code,
    type,
    value: valueDisplay,
    valueLabel,
    maxDiscount: maxDiscountDisplay,
    title,
    minOrder: minOrderDisplay,
    validUntil: formatExpiry(promo.endAt),
    code: promo.code,
    raw: promo,
  };
}

/**
 * Gọi API backend lấy danh sách khuyến mãi / voucher
 */
export async function fetchPromotions(signal?: AbortSignal): Promise<PromotionModel[]> {
  try {
    const response = await fetch("/api/v1/vouchers/public?limit=50", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Lỗi tải dữ liệu khuyến mãi (HTTP ${response.status})`);
    }

    const data = await response.json();
    const items: PromotionModel[] = data.data?.items || data.data || data.items || [];
    return items;
  } catch (error: any) {
    if (error.name === "AbortError") throw error;
    // Fallback thử endpoint /api/v1/promotions nếu có
    const fallbackRes = await fetch("/api/v1/promotions?limit=50", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal,
    });
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      return data.data?.items || data.data || data.items || [];
    }
    throw error;
  }
}

