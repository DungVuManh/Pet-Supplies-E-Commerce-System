// =============================================================
// lib/voucher-storage.ts
// Quản lý lưu trữ danh sách mã voucher của khách (Guest) trong LocalStorage
// =============================================================

const STORAGE_KEY = "petjoy_saved_vouchers";

/**
 * Lấy danh sách các mã voucher khách đã lưu từ LocalStorage
 */
export function getGuestSavedVouchers(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((c) => typeof c === "string" && c.trim().length > 0)
        .map((c) => c.trim().toUpperCase());
    }
    return [];
  } catch (error) {
    console.warn("[voucher-storage] Không thể đọc danh sách voucher đã lưu:", error);
    return [];
  }
}

/**
 * Lưu một mã voucher cho khách vãng lai
 */
export function saveGuestVoucher(code: string): string[] {
  if (typeof window === "undefined" || !code) return [];
  try {
    const normalized = code.trim().toUpperCase();
    const current = getGuestSavedVouchers();
    if (!current.includes(normalized)) {
      const updated = [...current, normalized];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch (error) {
    console.warn("[voucher-storage] Không thể lưu voucher vào LocalStorage:", error);
    return getGuestSavedVouchers();
  }
}

/**
 * Xóa một mã voucher khỏi LocalStorage của khách
 */
export function removeGuestVoucher(code: string): string[] {
  if (typeof window === "undefined" || !code) return [];
  try {
    const normalized = code.trim().toUpperCase();
    const current = getGuestSavedVouchers();
    const updated = current.filter((c) => c !== normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn("[voucher-storage] Không thể xóa voucher khỏi LocalStorage:", error);
    return getGuestSavedVouchers();
  }
}

/**
 * Kiểm tra xem một mã đã được lưu trong LocalStorage chưa
 */
export function isGuestVoucherSaved(code: string): boolean {
  if (typeof window === "undefined" || !code) return false;
  const normalized = code.trim().toUpperCase();
  const current = getGuestSavedVouchers();
  return current.includes(normalized);
}

/**
 * Xóa toàn bộ mã voucher đã lưu trong LocalStorage (sau khi đã đồng bộ thành công vào tài khoản)
 */
export function clearGuestSavedVouchers(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[voucher-storage] Không thể dọn dẹp LocalStorage:", error);
  }
}

