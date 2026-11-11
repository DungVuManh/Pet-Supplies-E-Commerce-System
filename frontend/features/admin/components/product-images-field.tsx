"use client";

import { ArrowLeft, ArrowRight, Star, Upload, X } from "lucide-react";
import { useId, useRef } from "react";
import { secondaryButton } from "@/components/workspace/workspace-ui";
import { useProductImages } from "../hooks/use-product-images";
import { MAX_PRODUCT_IMAGES } from "../validation";
import { ProductImage } from "./product-image";

const smallButton = "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface/95 text-ink shadow-sm hover:text-brand disabled:opacity-40";

/** The product's photos: the main one large, the rest as a sortable grid, and the upload button. */
export function ProductImagesField({ images, onChange, name, error }: { images: string[]; onChange: (images: string[]) => void; name: string; error?: string }) {
  const { uploading, error: uploadError, add, remove, makeMain, move } = useProductImages(images, onChange);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const message = uploadError || error;
  const full = images.length >= MAX_PRODUCT_IMAGES;

  return <div className="mt-4 space-y-4">
    <ProductImage src={images[0]} alt={images[0] ? `Ảnh chính của ${name || "sản phẩm"}` : ""} sizes="272px" className="aspect-[17/12]" />
    {images.length > 0 && <ul className="grid grid-cols-2 gap-3" aria-label="Ảnh sản phẩm">{images.map((url, index) => <li key={url} className="relative">
      <ProductImage src={url} alt={`Ảnh ${index + 1} của ${name || "sản phẩm"}`} sizes="128px" className={`aspect-square ${index === 0 ? "ring-2 ring-brand" : ""}`} />
      {index === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">Ảnh chính</span>}
      <button type="button" className={`${smallButton} absolute right-1.5 top-1.5`} aria-label={`Xóa ảnh ${index + 1}`} onClick={() => remove(index)}><X className="h-4 w-4" aria-hidden="true" /></button>
      <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
        <button type="button" className={smallButton} aria-label={`Chuyển ảnh ${index + 1} lên trước`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>
        {index > 0 && <button type="button" className={smallButton} aria-label={`Đặt ảnh ${index + 1} làm ảnh chính`} onClick={() => makeMain(index)}><Star className="h-4 w-4" aria-hidden="true" /></button>}
        <button type="button" className={smallButton} aria-label={`Chuyển ảnh ${index + 1} ra sau`} disabled={index === images.length - 1} onClick={() => move(index, 1)}><ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </li>)}</ul>}

    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
      onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
    <button id="product-images" type="button" className={`${secondaryButton} min-h-12 w-full gap-2 disabled:opacity-60`} disabled={uploading > 0 || full}
      aria-describedby={`${hintId}${message ? ` ${hintId}-error` : ""}`} onClick={() => input.current?.click()}>
      <Upload className="h-4 w-4" aria-hidden="true" />{uploading ? `Đang tải ${uploading} ảnh…` : full ? "Đã đủ ảnh" : "Tải ảnh lên"}
    </button>
    {uploading > 0 && <p role="status" className="text-xs text-brand">Đang tải ảnh lên, vui lòng chờ…</p>}
    {message && <p id={`${hintId}-error`} role="alert" className="text-xs text-danger">{message}</p>}
    <p id={hintId} className="text-xs text-muted">JPG, PNG, WebP · Tối đa 5 MB mỗi ảnh, {MAX_PRODUCT_IMAGES} ảnh mỗi sản phẩm. Ảnh đầu tiên là ảnh đại diện. Ảnh được lưu khi bạn lưu sản phẩm.</p>
  </div>;
}
