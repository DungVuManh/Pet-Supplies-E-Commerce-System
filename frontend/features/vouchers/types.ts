// =============================================================
// features/vouchers/types.ts
// Định nghĩa kiểu dữ liệu cho Voucher / Mã giảm giá
// =============================================================

export type VoucherType = "TOÀN SÀN" | "PHÍ SHIP" | "SẢN PHẨM";

export type VoucherItem = {
  id: string;
  type: VoucherType;
  value: string; // "5%", "50.000đ", "25.000đ"...
  valueLabel: "GIẢM" | "SHIP";
  maxDiscount?: string | null; // "tối đa 50.000đ", "tối đa 20.000đ" hoặc null
  title: string; // "Giảm 5% khi mua đơn 999k"
  minOrder: string; // "Từ 999.000đ"
  usageLimit: string; // "Không giới hạn"
  code: string; // "PV5999K"
  category: "all" | "shipping" | "product";
};

