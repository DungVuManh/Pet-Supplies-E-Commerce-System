"use client";

// =============================================================
// features/staff/components/returns-list.tsx
// Danh sách yêu cầu hoàn trả hàng trong Staff Workspace
// =============================================================

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  ActionLink,
  Badge,
  PageHeader,
  TableFrame,
  TableHead,
  Td,
  Th,
  control,
  secondaryButton,
} from "./staff-ui";
import { fetchStaffReturns, StaffReturnApiError } from "../returns/api";
import type {
  StaffReturnItem,
  StaffReturnsCounts,
  StaffReturnStatus,
} from "../returns/types";
import {
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
} from "../returns/types";

function formatVND(value: number | undefined | null): string {
  const num = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return num.toLocaleString("vi-VN") + " đ";
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month} · ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

const TABS: { id: StaffReturnStatus; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ xử lý" },
  { id: "approved", label: "Đã chấp nhận" },
  { id: "rejected", label: "Đã từ chối" },
];

export function ReturnsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlStatus = (searchParams.get("status") as StaffReturnStatus) || "all";
  const urlQuery = searchParams.get("query") || "";
  const urlPage = Number(searchParams.get("page")) || 1;

  const [activeTab, setActiveTab] = useState<StaffReturnStatus>(urlStatus);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [items, setItems] = useState<StaffReturnItem[]>([]);
  const [counts, setCounts] = useState<StaffReturnsCounts>({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchStaffReturns({
      status: activeTab,
      query: searchQuery,
      page: urlPage,
      pageSize: 10,
    })
      .then((res) => {
        if (!ignore) {
          setItems(res.items);
          setCounts(res.counts);
          setPagination(res.pagination);
          setIsLoading(false);
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setErrorMessage(
            err instanceof StaffReturnApiError
              ? err.message
              : "Không thể tải danh sách yêu cầu hoàn trả."
          );
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, searchQuery, urlPage]);

  const handleTabChange = (tab: StaffReturnStatus) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "all") {
      params.delete("status");
    } else {
      params.set("status", tab);
    }
    params.set("page", "1");
    router.push(`/staff/returns?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim());
    } else {
      params.delete("query");
    }
    params.set("page", "1");
    router.push(`/staff/returns?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu hoàn trả"
        subtitle="Quản lý và xét duyệt các yêu cầu hoàn trả đơn hàng từ khách hàng."
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-brand text-white shadow-xs"
                  : "bg-surface border border-line text-ink hover:bg-canvas"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : tab.id === "pending" && count > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-canvas text-ink-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm mã đơn, tên hoặc số điện thoại..."
          className={`${control} flex-1`}
        />
        <button type="submit" className={`${secondaryButton} whitespace-nowrap cursor-pointer`}>
          Tìm kiếm
        </button>
      </form>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Table */}
      <TableFrame>
        <TableHead>
          <Th>Mã đơn</Th>
          <Th>Khách hàng</Th>
          <Th>Lý do</Th>
          <Th>Ảnh minh chứng</Th>
          <Th>Tổng tiền</Th>
          <Th>Trạng thái</Th>
          <Th>Ngày yêu cầu</Th>
          <Th className="text-right">Thao tác</Th>
        </TableHead>
        <tbody className="divide-y divide-line">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-sm text-ink-muted">
                Đang tải danh sách...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-sm text-ink-muted">
                Không tìm thấy yêu cầu hoàn trả nào.
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const req = item.returnRequest;
              const reasonLabel = RETURN_REASON_LABELS[req.reason] || req.reason;
              const statusLabel = RETURN_STATUS_LABELS[req.status] || req.status;
              const tone =
                req.status === "approved"
                  ? "success"
                  : req.status === "rejected"
                  ? "danger"
                  : "warning";

              return (
                <tr key={item.id} className="hover:bg-canvas/50 transition-colors">
                  <Td className="font-semibold text-ink">
                    <Link
                      href={`/staff/returns/${item.id}`}
                      className="hover:text-brand transition-colors"
                    >
                      #{item.orderCode}
                    </Link>
                  </Td>
                  <Td>
                    <p className="font-medium text-ink">{item.customer.name}</p>
                    <p className="text-xs text-ink-muted">{item.customer.phone}</p>
                  </Td>
                  <Td>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-canvas border border-line text-ink">
                      {reasonLabel}
                    </span>
                  </Td>
                  <Td>
                    {req.images && req.images.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                        📷 <strong>{req.images.length}</strong> ảnh
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">Không có</span>
                    )}
                  </Td>
                  <Td>
                    <p className="font-semibold text-ink">{formatVND(item.total)}</p>
                    {req.refundRequired && (
                      <span className="inline-block mt-1 text-[11px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                        Cần hoàn tiền
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={tone}>{statusLabel}</Badge>
                  </Td>
                  <Td className="text-xs text-ink-muted whitespace-nowrap">
                    {formatDateTime(req.requestedAt)}
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <ActionLink href={`/staff/returns/${item.id}`}>
                      {req.status === "pending" ? "Xét duyệt" : "Xem chi tiết"}
                    </ActionLink>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableFrame>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="text-xs text-ink-muted">
            Trang {pagination.page} / {pagination.totalPages} ({pagination.totalItems} yêu cầu)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(pagination.page - 1));
                router.push(`/staff/returns?${params.toString()}`);
              }}
              className={`${secondaryButton} px-3 py-1.5 text-xs disabled:opacity-40 cursor-pointer`}
            >
              Trang trước
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(pagination.page + 1));
                router.push(`/staff/returns?${params.toString()}`);
              }}
              className={`${secondaryButton} px-3 py-1.5 text-xs disabled:opacity-40 cursor-pointer`}
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

