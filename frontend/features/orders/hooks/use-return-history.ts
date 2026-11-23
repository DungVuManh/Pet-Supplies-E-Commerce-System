import { useEffect, useState } from "react";
import type { CustomerOrderReturnRequest } from "../types";
import { getCustomerReturnDetail, getCustomerReturnHistory, type CustomerReturnHistory } from "../services/order-return.service";

export function useReturnHistory(orderId: string, version: string) {
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<string | null>(null);
  const [history, setHistory] = useState<{ key: string; data?: CustomerReturnHistory; error?: string }>();
  const [detail, setDetail] = useState<{ key: string; data?: CustomerOrderReturnRequest; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  const listKey = `${orderId}:${version}:${page}:${attempt}`;
  const detailKey = `${listKey}:${selection}`;

  useEffect(() => {
    const controller = new AbortController();
    getCustomerReturnHistory(orderId, page, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setHistory({ key: listKey, data }); },
      () => { if (!controller.signal.aborted) setHistory({ key: listKey, error: "Không thể tải lịch sử hoàn đơn." }); },
    );
    return () => controller.abort();
  }, [orderId, page, listKey]);

  useEffect(() => {
    if (!selection) return;
    const controller = new AbortController();
    getCustomerReturnDetail(orderId, selection, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setDetail({ key: detailKey, data }); },
      () => { if (!controller.signal.aborted) setDetail({ key: detailKey, error: "Không thể tải chi tiết yêu cầu." }); },
    );
    return () => controller.abort();
  }, [orderId, selection, detailKey]);

  return {
    page,
    setPage: (value: number) => { setPage(value); setSelection(null); },
    selection,
    setSelection,
    history: history?.key === listKey ? history : undefined,
    detail: detail?.key === detailKey ? detail : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
