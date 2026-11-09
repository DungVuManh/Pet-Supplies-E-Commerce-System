// =============================================================
// lib/voucher-sync.ts
// Tiện ích tự động đồng bộ voucher từ LocalStorage khi khách đăng nhập
// =============================================================

import { syncVouchersApi } from "@/features/vouchers/services/customer-voucher.service";
import { clearGuestSavedVouchers, getGuestSavedVouchers } from "./voucher-storage";

export async function syncGuestVouchersToBackend(): Promise<{ syncedCount: number }> {
  try {
    const codes = getGuestSavedVouchers();
    if (!codes || codes.length === 0) {
      return { syncedCount: 0 };
    }

    const res = await syncVouchersApi(codes);
    // Xóa bộ nhớ tạm sau khi đồng bộ thành công vào cơ sở dữ liệu
    clearGuestSavedVouchers();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("petjoy_vouchers_synced", { detail: { count: res.data?.syncedCount || 0 } }));
    }

    return { syncedCount: res.data?.syncedCount || 0 };
  } catch (error) {
    console.warn("[voucher-sync] Lỗi khi tự động đồng bộ mã giảm giá:", error);
    return { syncedCount: 0 };
  }
}

