"use client";

import Image from "next/image";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format-currency";
import { useCart } from "../cart-provider";

export function CartPreview() {
  const { items, quantity, total, removeItem } = useCart();
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="min-h-6 hover:text-brand" aria-haspopup="dialog">
        Giỏ hàng ({quantity})
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cart-title"
        className="fixed inset-0 m-auto max-h-[calc(100dvh_-_3rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto whitespace-normal rounded-2xl border border-line bg-surface p-6 text-ink backdrop:bg-ink/40 sm:p-8"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="cart-title" className="text-2xl font-semibold">Giỏ hàng của bạn</h2>
          <button type="button" aria-label="Đóng giỏ hàng" onClick={() => dialog.current?.close()} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted hover:bg-canvas">×</button>
        </div>
        {items.length === 0 ? (
          <p className="py-10 text-center leading-relaxed text-muted">Giỏ hàng đang trống. Khám phá những món đồ bé yêu thích nhé!</p>
        ) : (
          <ul className="my-6 divide-y divide-line">
            {items.map(({ product, quantity: itemQuantity }) => (
              <li key={product.id} className="flex items-start gap-4 py-4">
                <Image src={product.image} alt="" width={64} height={64} className="size-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-normal text-sm font-semibold leading-relaxed">{product.name}</p>
                  <p className="mt-1 text-xs text-muted">Số lượng: {itemQuantity}</p>
                  <p className="mt-2 text-sm font-semibold">{formatCurrency(product.price * itemQuantity)}</p>
                  <button type="button" aria-label={`Xóa ${product.name} khỏi giỏ hàng`} onClick={() => removeItem(product.id)} className="mt-2 min-h-6 text-xs text-danger hover:underline">Xóa</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-4 border-t border-line pt-5 text-lg font-semibold">
          <span>Tạm tính</span><span>{formatCurrency(total)}</span>
        </div>
        <p className="mt-3 whitespace-normal text-xs leading-relaxed text-muted">Giỏ hàng được giữ trong phiên xem này. Bạn có thể tiếp tục mua sắm mà không cần đăng nhập.</p>
        <Button className="mt-6 w-full" onClick={() => dialog.current?.close()}>Tiếp tục mua sắm</Button>
      </dialog>
    </>
  );
}
