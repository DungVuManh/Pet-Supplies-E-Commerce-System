"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { deleteReview, listReviews } from "../services/reviews";
import type { AdminReviewRow, ReviewFilter } from "../types";
import { useAdminList } from "./use-admin-list";

const initial: ReviewFilter = { q: "", rating: "all" };

/** The filtered customer reviews, and the confirmation that deletes one. */
export function useReviewsList() {
  const list = useAdminList(listReviews, initial, { pageSize: 10 });
  const [deleting, setDeleting] = useState<AdminReviewRow | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  // "2 giờ trước" is measured from when the screen opened, so rendering stays pure.
  const [now] = useState(() => Date.now());

  function askDelete(review: AdminReviewRow) {
    setDeleteError("");
    setNotice("");
    setDeleting(review);
  }

  function cancelDelete() {
    if (!pending) setDeleting(null);
  }

  async function confirmDelete() {
    if (!deleting || pending) return;
    setDeleteError("");
    setPending(true);
    try {
      await deleteReview(deleting.id);
      setNotice(`Đã xóa đánh giá của ${deleting.customer.name}.`);
      setDeleting(null);
      list.reload();
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setNotice("Đánh giá này đã được xóa trước đó.");
        setDeleting(null);
        list.reload();
      } else {
        setDeleteError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setPending(false);
    }
  }

  return { ...list, now, deleting, pending, deleteError, notice, askDelete, cancelDelete, confirmDelete };
}
