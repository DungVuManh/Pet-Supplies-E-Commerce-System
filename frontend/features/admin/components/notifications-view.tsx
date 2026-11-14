"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BellOff, Bookmark, BookmarkCheck, RefreshCw, Settings, ShoppingBag, Warehouse } from "lucide-react";
import { AdminPageHeader } from "./admin-ui";
import {
  filterNotifications,
  notificationTypeLabels,
  unreadNotificationsCount,
  type NotificationItem,
  type NotificationType,
} from "../mock/notifications";
import { Badge, ListState, listStatePill, TabNav, card, control, secondaryButton } from "@/components/workspace/workspace-ui";
import { useListState } from "@/components/workspace/use-list-state";
import { apiGet } from "@/lib/api-client";

type TabKey = "unread" | "all" | "saved";

const STORAGE_KEY_READ = "petly_admin_read_notifications";
const STORAGE_KEY_SAVED = "petly_admin_saved_notifications";

export function NotificationsView() {
  const router = useRouter();
  const forcedState = useListState();

  const [rawItems, setRawItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_READ);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [activeTab, setActiveTab] = useState<TabKey>("unread");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  // Tải danh sách thông báo thực tế từ Backend (Product, Order, Setting, AuditLog)
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ items: NotificationItem[]; total: number }>("/api/v1/admin/notifications");
      if (res?.items && Array.isArray(res.items)) {
        setRawItems(res.items);
      } else {
        setRawItems([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kết nối đến máy chủ bị gián đoạn. Kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Kết hợp trạng thái đã đọc / đã lưu cục bộ với dữ liệu thời gian thực từ Backend
  const items = useMemo<NotificationItem[]>(() => {
    return rawItems.map((item) => ({
      ...item,
      read: readIds.has(item.id),
      saved: savedIds.has(item.id),
    }));
  }, [rawItems, readIds, savedIds]);

  const unreadTotal = unreadNotificationsCount(items);

  // Tab change
  const handleTabSelect = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === "unread") {
      setStatusFilter("Chưa đọc");
    } else if (statusFilter === "Chưa đọc") {
      setStatusFilter("Tất cả");
    }
  };

  // Toggle read state
  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Toggle saved state
  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Mark all as read
  const markAllAsRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const item of rawItems) {
        next.add(item.id);
      }
      try {
        localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setTypeFilter("Tất cả");
    setStatusFilter("Tất cả");
    setActiveTab("all");
  };

  // Filtered notifications
  const filteredList = useMemo(() => {
    return filterNotifications(items, {
      tab: activeTab,
      search,
      type: typeFilter,
      status: statusFilter,
    });
  }, [items, activeTab, search, typeFilter, statusFilter]);

  const isEffectiveLoading = forcedState === "loading" || loading;
  const isEffectiveError = forcedState === "error" || Boolean(error);
  const isEmpty = forcedState === "empty" || (!isEffectiveLoading && !isEffectiveError && filteredList.length === 0);

  const tabs = [
    {
      label: `Chưa đọc (${unreadTotal})`,
      active: activeTab === "unread",
      onSelect: () => handleTabSelect("unread"),
    },
    {
      label: "Tất cả thông báo",
      active: activeTab === "all",
      onSelect: () => handleTabSelect("all"),
    },
    {
      label: "Đã lưu",
      active: activeTab === "saved",
      onSelect: () => handleTabSelect("saved"),
    },
  ];

  const typeIcon = (type: NotificationType) => {
    switch (type) {
      case "order":
        return <ShoppingBag className="h-5 w-5 text-brand" aria-hidden="true" />;
      case "stock":
        return <Warehouse className="h-5 w-5 text-warning" aria-hidden="true" />;
      case "system":
        return <Settings className="h-5 w-5 text-muted" aria-hidden="true" />;
    }
  };

  const actionHeader = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={fetchNotifications}
        disabled={loading}
        className={`${secondaryButton} min-h-12 flex items-center gap-2`}
        title="Làm mới thông báo"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        <span>Làm mới</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Thông báo", "Thông báo"]}
        title="Thông báo"
        subtitle="Tất cả cập nhật đơn hàng, tồn kho và hoạt động hệ thống từ cơ sở dữ liệu."
        actions={actionHeader}
      />

      <TabNav items={tabs} label="Bộ lọc thông báo" />

      {/* Main Card */}
      <section className={`${card} min-w-0 overflow-hidden`}>
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Thông báo hệ thống</h2>
            {unreadTotal > 0 && activeTab !== "unread" && !forcedState && !isEffectiveLoading && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          <div>
            {forcedState ? (
              <Badge tone={listStatePill[forcedState].tone}>
                {forcedState === "error" ? "Lỗi kết nối" : listStatePill[forcedState].label}
              </Badge>
            ) : isEffectiveLoading ? (
              <Badge tone="neutral">Đang tải...</Badge>
            ) : unreadTotal === 0 ? (
              <Badge tone="neutral">0 chưa đọc</Badge>
            ) : (
              <Badge tone="warning">{unreadTotal} chưa đọc</Badge>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid gap-4 border-b border-line p-6 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px]">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="notif-search" className="text-xs font-medium text-muted">
              Tìm kiếm thông báo
            </label>
            <input
              id="notif-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tiêu đề hoặc nội dung thông báo"
              disabled={isEffectiveLoading}
              className={control}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="notif-type" className="text-xs font-medium text-muted">
              Loại thông báo
            </label>
            <select
              id="notif-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              disabled={isEffectiveLoading}
              className={control}
            >
              <option value="Tất cả">Tất cả</option>
              <option value="Đơn hàng">Đơn hàng</option>
              <option value="Kho hàng">Kho hàng</option>
              <option value="Hệ thống">Hệ thống</option>
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="notif-status" className="text-xs font-medium text-muted">
              Trạng thái
            </label>
            <select
              id="notif-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isEffectiveLoading}
              className={control}
            >
              <option value="Tất cả">Tất cả</option>
              <option value="Chưa đọc">Chưa đọc</option>
              <option value="Đã đọc">Đã đọc</option>
            </select>
          </div>
        </div>

        {/* Card Body */}
        {isEffectiveLoading ? (
          <>
            <div className="p-6">
              <p className="font-semibold text-muted">Đang tải thông báo từ máy chủ...</p>
              <div className="mt-6 space-y-6" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-line animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-line animate-pulse" />
                      <div className="h-3 w-3/4 rounded bg-line animate-pulse" />
                      <div className="h-3 w-1/4 rounded bg-line animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-line px-6 py-4 text-xs text-muted">
              Đang đồng bộ thông báo thời gian thực từ cơ sở dữ liệu.
            </div>
          </>
        ) : isEffectiveError ? (
          <>
            <div className="p-6">
              <ListState
                kind="error"
                icon={<AlertCircle className="h-12 w-12 text-danger stroke-1" />}
                title="Không thể tải thông báo"
                description={error || "Kết nối đến máy chủ bị gián đoạn. Kiểm tra kết nối mạng và thử lại."}
                action={
                  <button
                    type="button"
                    onClick={fetchNotifications}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-hover"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    <span>Thử lại</span>
                  </button>
                }
              />
            </div>
          </>
        ) : isEmpty ? (
          <>
            <div className="p-6">
              <ListState
                kind="empty"
                icon={<BellOff className="h-12 w-12 text-muted stroke-1" />}
                title={
                  activeTab === "unread"
                    ? "Không có thông báo chưa đọc"
                    : activeTab === "saved"
                    ? "Chưa có thông báo nào được lưu"
                    : "Không tìm thấy thông báo nào"
                }
                description={
                  activeTab === "unread"
                    ? "Tất cả các thông báo cập nhật đơn hàng và tồn kho đã được đọc."
                    : activeTab === "saved"
                    ? "Bấm 'Lưu' trên bất kỳ thông báo nào để lưu lại xem sau."
                    : "Không có thông báo nào phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại."
                }
                action={
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-hover"
                  >
                    Xem tất cả thông báo
                  </button>
                }
              />
            </div>
            <div className="border-t border-line px-6 py-4 text-xs text-muted">
              0 kết quả · Bộ lọc hiện tại được giữ nguyên
            </div>
          </>
        ) : (
          <ul className="divide-y divide-line">
            {filteredList.map((item) => (
              <li
                key={item.id}
                className={`flex flex-col gap-4 p-6 transition-colors sm:flex-row sm:items-start sm:justify-between ${
                  !item.read ? "bg-brand-subtle/30" : "hover:bg-canvas/50"
                }`}
              >
                <div className="flex gap-4">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      item.type === "stock"
                        ? "bg-warning-subtle"
                        : item.type === "order"
                        ? "bg-brand-subtle"
                        : "bg-canvas"
                    }`}
                  >
                    {typeIcon(item.type)}
                  </span>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-base ${!item.read ? "font-bold text-ink" : "font-semibold text-ink"}`}>
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-brand" title="Chưa đọc" />
                      )}
                    </div>

                    <p className="text-sm leading-relaxed text-muted">{item.detail}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted">
                      <span>{item.createdAt}</span>
                      <span>·</span>
                      <span className="font-medium text-ink">
                        {notificationTypeLabels[item.type]}
                      </span>
                      {item.targetHref && (
                        <>
                          <span>·</span>
                          <Link
                            href={item.targetHref}
                            className="font-medium text-brand hover:underline"
                          >
                            Xem chi tiết →
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => toggleRead(item.id)}
                    className="inline-flex min-h-8 items-center rounded-lg border border-line bg-surface px-3 text-xs font-semibold hover:bg-canvas"
                    title={item.read ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                  >
                    {item.read ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSave(item.id)}
                    className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-3 text-xs font-semibold ${
                      item.saved
                        ? "border-brand/30 bg-brand-subtle text-brand"
                        : "border-line bg-surface text-muted hover:text-ink"
                    }`}
                    title={item.saved ? "Bỏ lưu" : "Lưu thông báo"}
                  >
                    {item.saved ? (
                      <>
                        <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Đã lưu
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                        Lưu
                      </>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Page Footer Footnote */}
      <footer className="text-xs text-muted">
        {forcedState === "loading" ? (
          "Đang đồng bộ thông báo mới nhất từ hệ thống."
        ) : forcedState === "error" ? (
          "Thông báo chưa đọc vẫn được giữ nguyên. Liên hệ support@petjoy.vn nếu lỗi tiếp tục xảy ra."
        ) : (
          "Thông báo được tổng hợp thời gian thực từ đơn hàng, kho hàng và hệ thống. Không sử dụng dữ liệu giả."
        )}
      </footer>
    </div>
  );
}
