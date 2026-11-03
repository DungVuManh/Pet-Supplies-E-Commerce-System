"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { deleteVoucher, disableVoucher, enableVoucher, listVouchers } from "../services/vouchers";
import type { AdminVoucherRow, VoucherFilter } from "../types";
import { useAdminList } from "./use-admin-list";

const initial: VoucherFilter = { tab: "all", q: "" };
const UNKNOWN_ERROR = "Đã có lỗi xảy ra. Vui lòng thử lại.";

type Confirming = { kind: "disable" | "delete"; voucher: AdminVoucherRow };

/** The voucher list and its row actions. Turning off and deleting ask first (CR-12); turning on does not. */
export function useVouchersList() {
  const list = useAdminList(listVouchers, initial);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  async function enable(voucher: AdminVoucherRow) {
    if (pending) return;
    setNotice("");
    setPending(true);
    try {
      await enableVoucher(voucher.code);
      setNotice(`Đã bật voucher ${voucher.code}.`);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : UNKNOWN_ERROR);
    } finally {
      setPending(false);
      list.reload();
    }
  }

  async function confirm() {
    if (!confirming || pending) return;
    const { kind, voucher } = confirming;
    setActionError("");
    setPending(true);
    try {
      if (kind === "delete") await deleteVoucher(voucher.code);
      else await disableVoucher(voucher.code);
      setConfirming(null);
      setNotice(`Đã ${kind === "delete" ? "xóa" : "tắt"} voucher ${voucher.code}.`);
      list.reload();
    } catch (error) {
      // A refused delete keeps the dialog open, so the reason stays next to the action.
      setActionError(error instanceof ApiError ? error.message : UNKNOWN_ERROR);
      if (error instanceof ApiError && error.status === 409) list.reload();
    } finally {
      setPending(false);
    }
  }

  return {
    ...list, confirming, pending, actionError, notice, enable, confirm,
    ask(kind: Confirming["kind"], voucher: AdminVoucherRow) {
      setActionError("");
      setNotice("");
      setConfirming({ kind, voucher });
    },
    cancel() { if (!pending) setConfirming(null); },
  };
}
