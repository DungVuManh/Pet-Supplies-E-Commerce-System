// =============================================================
// features/vouchers/types.ts
// Định nghĩa kiểu dữ liệu cho Voucher / Promotion
// =============================================================

export type VoucherType = "TOÀN SÀN" | "PHÍ SHIP" | "SẢN PHẨM";

export type PromotionModel = {
  _id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  name?: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
};

export type VoucherItem = {
  id: string;
  type: VoucherType;
  value: string; // "10%", "30.000đ"...
  valueLabel: "GIẢM" | "SHIP";
  maxDiscount?: string | null; // "tối đa 50.000đ" hoặc null
  title: string; // "Giảm 10% cho mọi đơn hàng", "Giảm 30k cho đơn từ 500k"
  minOrder: string; // "Từ 500.000đ" hoặc "Từ 0đ"
  validUntil: string; // "HSD 03/12/2026" hoặc "Không giới hạn"
  code: string; // "SEED-PETLY10"
  raw?: PromotionModel;
};
