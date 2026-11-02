"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { hideProduct, showProduct } from "../services/products";
import type { AdminProductDetail } from "../types";

/** The product's visibility: hiding asks for confirmation first (CR-12), showing does not. */
export function useProductVisibility(product: AdminProductDetail) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(product);
  const [state, setState] = useState({ isActive: product.isActive, status: product.status });
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Newly loaded server data wins over the last response.
  if (loaded !== product) {
    setLoaded(product);
    setState({ isActive: product.isActive, status: product.status });
  }

  async function change(hide: boolean) {
    if (pending) return;
    setError("");
    setNotice("");
    setPending(true);
    try {
      const result = hide ? await hideProduct(product.sku) : await showProduct(product.sku);
      setState({ isActive: result.isActive, status: result.status });
      setConfirming(false);
      setNotice(`${hide ? "Đã ẩn" : "Đã hiển thị lại"} sản phẩm ${product.sku}.`);
      router.refresh(); // The new audit entry belongs in the history tab.
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      if (caught instanceof ApiError && caught.status === 409) {
        // Another Admin got there first: show what is true now.
        setConfirming(false);
        setNotice(message);
        router.refresh();
      } else if (hide) {
        setError(message);
      } else {
        setNotice(message);
      }
    } finally {
      setPending(false);
    }
  }

  return {
    ...state, confirming, pending, notice, error,
    /** Asks first when hiding; showing applies straight away. */
    toggle() {
      setError("");
      if (state.isActive) setConfirming(true);
      else void change(false);
    },
    confirmHide: () => change(true),
    cancelHide() { if (!pending) setConfirming(false); },
  };
}
