"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { uploadProductImages } from "../services/products";
import { productImagesError } from "../validation";

/**
 * Upload, remove, and order a product's photos. `images` and `onChange` belong
 * to the form, so the photos are saved with the rest of the product; the first
 * one is the main photo.
 */
export function useProductImages(images: string[], onChange: (images: string[]) => void) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");

  async function add(list: FileList | null) {
    const files = [...(list ?? [])];
    if (files.length === 0 || uploading) return;
    const problem = productImagesError(files, images.length);
    if (problem) { setError(problem); return; }
    setError("");
    setUploading(files.length);
    try {
      const { urls } = await uploadProductImages(files);
      onChange([...images, ...urls]);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Chưa thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploading(0);
    }
  }

  function remove(index: number) {
    setError("");
    onChange(images.filter((_, at) => at !== index));
  }

  function makeMain(index: number) {
    onChange([images[index], ...images.filter((_, at) => at !== index)]);
  }

  /** Moves a photo one place earlier (-1) or later (+1). */
  function move(index: number, step: -1 | 1) {
    const target = index + step;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return { uploading, error, add, remove, makeMain, move };
}
