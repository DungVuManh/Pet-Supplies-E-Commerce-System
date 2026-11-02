"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { deleteCategory, listCategories } from "../services/categories";
import type { AdminCategoryRow, CategoryFilter } from "../types";
import { useAdminList } from "./use-admin-list";

const initial: CategoryFilter = { q: "", status: "all" };

/** The filtered category tree, and the confirmation that deletes a category. */
export function useCategoryTree() {
  const list = useAdminList(listCategories, initial);
  const [deleting, setDeleting] = useState<AdminCategoryRow | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");

  function askDelete(category: AdminCategoryRow) {
    setDeleteError("");
    setNotice("");
    setDeleting(category);
  }

  function cancelDelete() {
    if (!pending) setDeleting(null);
  }

  async function confirmDelete() {
    if (!deleting || pending) return;
    setDeleteError("");
    setPending(true);
    try {
      await deleteCategory(deleting.ref);
      setNotice(`Đã xóa danh mục “${deleting.name}”.`);
      setDeleting(null);
      list.reload();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CATEGORY_IN_USE") {
        // The server's reason belongs on the page: nothing in the dialog can fix it.
        setNotice(`${error.message} Chuyển sản phẩm hoặc danh mục con sang nơi khác trước khi xóa.`);
        setDeleting(null);
      } else if (error instanceof ApiError && error.status === 404) {
        setNotice("Danh mục này đã được xóa trước đó.");
        setDeleting(null);
        list.reload();
      } else {
        setDeleteError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setPending(false);
    }
  }

  return { ...list, deleting, pending, deleteError, notice, askDelete, cancelDelete, confirmDelete };
}
