// =============================================================
// features/vouchers/hooks/use-customer-vouchers.ts
// Hook quản lý danh sách mã giảm giá đã lưu của người dùng & khách
// =============================================================

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import {
  getSavedVoucherCodesApi,
  removeVoucherApi,
  saveVoucherApi,
} from "../services/customer-voucher.service";
import {
  getGuestSavedVouchers,
  removeGuestVoucher,
  saveGuestVoucher,
} from "@/lib/voucher-storage";

export function useCustomerVouchers() {
  const { user, status } = useAuth();
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCodes = useCallback(async () => {
    if (status === "loading") return;

    if (user) {
      try {
        setIsLoading(true);
        const codes = await getSavedVoucherCodesApi();
        setSavedCodes(codes.map((c) => c.toUpperCase()));
      } catch (err) {
        console.warn("[useCustomerVouchers] Lỗi tải mã đã lưu:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      const guestCodes = getGuestSavedVouchers();
      setSavedCodes(guestCodes);
      setIsLoading(false);
    }
  }, [user, status]);

  useEffect(() => {
    void fetchCodes();

    const handleSync = () => {
      void fetchCodes();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("petjoy_vouchers_synced", handleSync);
      return () => {
        window.removeEventListener("petjoy_vouchers_synced", handleSync);
      };
    }
  }, [fetchCodes]);

  const isSaved = useCallback(
    (code: string): boolean => {
      if (!code) return false;
      return savedCodes.includes(code.trim().toUpperCase());
    },
    [savedCodes]
  );

  const toggleSaveVoucher = useCallback(
    async (code: string): Promise<boolean> => {
      if (!code) return false;
      const normalized = code.trim().toUpperCase();
      const alreadySaved = savedCodes.includes(normalized);

      // Optimistic update
      const nextSaved = !alreadySaved;
      setSavedCodes((prev) =>
        nextSaved ? [...prev, normalized] : prev.filter((c) => c !== normalized)
      );

      if (user) {
        try {
          if (nextSaved) {
            await saveVoucherApi(normalized);
          } else {
            await removeVoucherApi(normalized);
          }
          return nextSaved;
        } catch (error) {
          // Rollback on error
          setSavedCodes((prev) =>
            alreadySaved ? [...prev, normalized] : prev.filter((c) => c !== normalized)
          );
          throw error;
        }
      } else {
        // Guest mode LocalStorage
        try {
          if (nextSaved) {
            saveGuestVoucher(normalized);
          } else {
            removeGuestVoucher(normalized);
          }
          return nextSaved;
        } catch (error) {
          setSavedCodes((prev) =>
            alreadySaved ? [...prev, normalized] : prev.filter((c) => c !== normalized)
          );
          throw error;
        }
      }
    },
    [savedCodes, user]
  );

  return {
    savedCodes,
    isLoading,
    isSaved,
    toggleSaveVoucher,
    refreshSavedCodes: fetchCodes,
  };
}

