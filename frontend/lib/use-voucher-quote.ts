"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api-client";
import {
  VOUCHER_APPLIED_MESSAGE, VOUCHER_NONE_MESSAGE, forgetVoucherCode, rememberVoucherCode, rememberedVoucherCode,
  type VoucherQuote, type VoucherQuoteItem,
} from "./voucher";
import { quoteVoucher } from "./voucher-api";

const QUOTE_DELAY_MS = 300;

/**
 * The voucher state behind `PromoCodeCard`, shared by the cart and checkout. An applied code is
 * quoted again whenever the items or the guest's phone change. `remember` carries the code between
 * pages; Buy Now turns it off, because a code remembered from the cart belongs to different items.
 */
export function useVoucherQuote({ items, phone, remember }: { items: VoucherQuoteItem[]; phone?: string; remember: boolean }) {
  const [input, setInput] = useState("");
  const [applied, setApplied] = useState<VoucherQuote | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(VOUCHER_NONE_MESSAGE);
  const [isError, setIsError] = useState(false);
  // The code being kept up to date, and the latest request, so an older response cannot overwrite a newer one.
  const activeCode = useRef<string | null>(null);
  const latestRequest = useRef(0);

  const itemsKey = JSON.stringify(items);

  const run = useCallback(async (code: string, lines: VoucherQuoteItem[], guestPhone?: string) => {
    const request = ++latestRequest.current;
    setPending(true);
    setInput(code);
    try {
      const quote = await quoteVoucher(code, lines, guestPhone);
      if (request !== latestRequest.current) return;
      activeCode.current = quote.code;
      setApplied(quote);
      setInput(quote.code);
      setMessage(VOUCHER_APPLIED_MESSAGE);
      setIsError(false);
      if (remember) rememberVoucherCode(quote.code);
    } catch (error) {
      if (request !== latestRequest.current) return;
      setMessage(error instanceof ApiError ? error.message : "Không thể kiểm tra mã giảm giá. Vui lòng thử lại.");
      setIsError(true);
      // Only the server saying no drops the code. After a network error the order step still decides.
      if (error instanceof ApiError && error.code === "VOUCHER_INVALID") {
        activeCode.current = null;
        setApplied(null);
        if (remember) forgetVoucherCode();
      }
    } finally {
      if (request === latestRequest.current) setPending(false);
    }
  }, [remember]);

  useEffect(() => {
    const lines = JSON.parse(itemsKey) as VoucherQuoteItem[];
    if (lines.length === 0) return;
    const code = activeCode.current ?? (remember ? rememberedVoucherCode() : null);
    if (!code) return;
    const timer = setTimeout(() => void run(code, lines, phone), QUOTE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [itemsKey, phone, remember, run]);

  return {
    input, applied, pending, message, isError,
    setInput(value: string) {
      setInput(value);
      setMessage(applied ? VOUCHER_APPLIED_MESSAGE : VOUCHER_NONE_MESSAGE);
      setIsError(false);
    },
    apply() {
      const code = input.trim().toUpperCase();
      if (!code) {
        setMessage("Vui lòng nhập mã giảm giá.");
        setIsError(true);
        return;
      }
      void run(code, JSON.parse(itemsKey) as VoucherQuoteItem[], phone);
    },
    remove() {
      latestRequest.current += 1;
      activeCode.current = null;
      setApplied(null);
      setInput("");
      setPending(false);
      setMessage(VOUCHER_NONE_MESSAGE);
      setIsError(false);
      if (remember) forgetVoucherCode();
    },
    /** Asks the server again, after an order was refused because the voucher changed. */
    refresh() {
      if (activeCode.current) void run(activeCode.current, JSON.parse(itemsKey) as VoucherQuoteItem[], phone);
    },
  };
}
