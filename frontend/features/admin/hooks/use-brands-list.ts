"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { deleteBrand, listBrands } from "../services/brands";
import type { BrandFilter, MasterDataRow } from "../types";
import { useAdminList } from "./use-admin-list";

const initial: BrandFilter = { q: "", status: "all" };

/** The filtered brands, and the confirmation that deletes a brand. */
export function useBrandsList() {
  const list = useAdminList(listBrands, initial);
  const [deleting, setDeleting] = useState<MasterDataRow | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");

  function askDelete(brand: MasterDataRow) {
    setDeleteError("");
    setNotice("");
    setDeleting(brand);
  }

  function cancelDelete() {
    if (!pending) setDeleting(null);
  }

  async function confirmDelete() {
    if (!deleting || pending) return;
    setDeleteError("");
    setPending(true);
    try {
      await deleteBrand(deleting.code);
      setNotice(`Đã xóa thương hiệu “${deleting.name}”.`);
      setDeleting(null);
      list.reload();
    } catch (error) {
      if (error instanceof ApiError && error.code === "MASTER_DATA_IN_USE") {
        // Nothing in the dialog can fix this, so the reason goes on the page.
        setNotice(error.message);
        setDeleting(null);
      } else if (error instanceof ApiError && error.status === 404) {
        setNotice("Thương hiệu này đã được xóa trước đó.");
        setDeleting(null);
        list.reload();
      } else {
        setDeleteError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setPending(false);
    }
  }

  // The new and edit pages return here with `?saved=<code>`. A later action's notice replaces it.
  const saved = useSearchParams().get("saved");
  const shownNotice = notice || (saved ? `Đã lưu thương hiệu ${saved}.` : "");

  return { ...list, deleting, pending, deleteError, notice: shownNotice, askDelete, cancelDelete, confirmDelete };
}
