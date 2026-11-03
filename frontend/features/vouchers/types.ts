// =============================================================
// features/vouchers/types.ts
// Định nghĩa kiểu dữ liệu cho Voucher / Mã giảm giá
// =============================================================

export type VoucherType = "TOÀN SÀN";

export type VoucherItem = {
  id: string;
  type: VoucherType;
  value: string; // "5%", "50.000đ"...
  valueLabel: "GIẢM";
  maxDiscount?: string | null; // "tối đa 50.000đ", "tối đa 20.000đ" hoặc null
  title: string; // "Giảm 5% khi mua đơn 999k"
  minOrder: string; // "Từ 999.000đ"
  validUntil: string; // "HSD 30/11/2026"
  code: string; // "PET50K"
};

