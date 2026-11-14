"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import type { ExportPage } from "../types";

/**
 * The state of an export button. `load` fetches every matching row and `write`
 * saves the file; `noun` names the rows in the notices ("sản phẩm", "đơn hàng").
 */
export function useExport<T>(load: () => Promise<ExportPage<T>>, write: (items: T[]) => void, noun: string) {
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");

  async function run() {
    if (exporting) return;
    setExporting(true);
    setNotice("");
    try {
      const { items, total, truncated } = await load();
      if (items.length === 0) {
        setNotice(`Không có ${noun} nào khớp bộ lọc hiện tại; chưa tạo tệp.`);
        return;
      }
      write(items);
      setNotice(truncated
        ? `Tệp chỉ gồm ${items.length.toLocaleString("vi-VN")} dòng đầu trên tổng ${total.toLocaleString("vi-VN")}. Thu hẹp bộ lọc để xuất phần còn lại.`
        : `Đã xuất ${items.length.toLocaleString("vi-VN")} ${noun}.`);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Chưa thể xuất tệp. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  }

  return { exporting, notice, run };
}
