import Image from "next/image";
import { Package } from "lucide-react";

/** Product photo on the warm backdrop used by the designs, or a neutral tile when the catalog has no photo yet. */
export function ProductImage({ src, alt, sizes, className = "" }: { src?: string; alt: string; sizes: string; className?: string }) {
  return <div className={`relative overflow-hidden rounded-lg bg-canvas ${className}`}>
    {src
      ? <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      : <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted"><Package className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" /><span className="text-xs">Chưa có ảnh</span></div>}
  </div>;
}
