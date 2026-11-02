"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BellOff,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Settings,
  ShoppingBag,
  Warehouse,
} from "lucide-react";
import { AdminPageHeader } from "./admin-ui";
import {
  notificationTypeLabels,
  type NotificationItem,
  type NotificationType,
} from "../mock/notifications";
import {
  Badge,
  ListState,
  listStatePill,
  TabNav,
  card,
  control,
  secondaryButton,
} from "@/components/workspace/workspace-ui";
import { useListState } from "@/components/workspace/use-list-state";
import { apiGet, apiSend } from "@/lib/api-client";

type TabKey = "unread" | "all" | "saved";

interface NotificationApiResponse {
  items: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts: {
    unread: number;
    all: number;
    saved: number;
  };
}

export function NotificationsView() {
  const router = useRouter();
  const forcedState = useListState();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState({ unread: 0, all: 0, saved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("unread");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  // Tải danh sách thông báo thực tế từ Backend
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<NotificationApiResponse>("/api/v1/admin/notifications", {
        tab: activeTab,
        type: typeFilter !== "Tất cả" ? typeFilter : undefined,
        status: statusFilter !== "Tất cả" ? statusFilter : undefined,
        q: search.trim() || undefined,
      });
      setItems(data.items);
      setCounts(data.counts);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kết nối đến máy chủ bị gián đoạn. Kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Tab change
  const handleTabSelect = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === "unread") {
      setStatusFilter("Chưa đọc");
    } else if (statusFilter === "Chưa đọc") {
      setStatusFilter("Tất cả");
    }
  };

  // Toggle read state (Cập nhật lạc quan & đồng bộ Backend)
  const toggleRead = async (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    const nextRead = !target.read;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: nextRead } : item)),
    );
    setCounts((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread + (nextRead ? -1 : 1)),
    }));

    try {
      await apiSend("PATCH", `/api/v1/admin/notifications/${id}/read`, { read: nextRead });
    } catch {
      // Rollback nếu API lỗi
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: target.read } : item)),
      );
      setCounts((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread + (target.read ? -1 : 1)),
      }));
    }
  };

  // Toggle saved state (Cập nhật lạc quan & đồng bộ Backend)
  const toggleSave = async (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    const nextSaved = !target.saved;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, saved: nextSaved } : item)),
    );
    setCounts((prev) => ({
      ...prev,
      saved: Math.max(0, prev.saved + (nextSaved ? 1 : -1)),
    }));

    try {
      await apiSend("PATCH", `/api/v1/admin/notifications/${id}/save`, { saved: nextSaved });
    } catch {
      // Rollback nếu API lỗi
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, saved: target.saved } : item)),
      );
      setCounts((prev) => ({
        ...prev,
        saved: Math.max(0, prev.saved + (target.saved ? 1 : -1)),
      }));
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setCounts((prev) => ({ ...prev, unread: 0 }));

    try {
      await apiSend("POST", "/api/v1/admin/notifications/mark-all-read", {});
    } catch {
      fetchNotifications();
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setTypeFilter("Tất cả");
    setStatusFilter("Tất cả");
    setActiveTab("all");
  };

  const isEffectiveLoading = forcedState === "loading" || (loading && items.length === 0);
  const isEffectiveError = forcedState === "error" || (Boolean(error) && items.length === 0);
  const isEffectiveEmpty = forcedState === "empty" || (!loading && items.length === 0);

  const tabs = [
    {
      label: `Chưa đọc (${counts.unread})`,
      active: activeTab === "unread",
      onSelect: () => handleTabSelect("unread"),
    },
    {
      label: `Tất cả thông báo (${counts.all})`,
      active: activeTab === "all",
      onSelect: () => handleTabSelect("all"),
    },
    {
      label: `Đã lưu (${counts.saved})`,
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
    <Link href="/admin/system/settings" className={`${secondaryButton} min-h-12`}>
      Cài đặt thông báo
    </Link>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Thông báo", "Thông báo"]}
        title="Thông báo"
        subtitle="Tất cả cập nhật đơn hàng, tồn kho và hoạt động hệ thống."
        actions={actionHeader}
      />

      <TabNav items={tabs} label="Bộ lọc thông báo" />

      {/* Main Card */}
      <section className={`${card} min-w-0 overflow-hidden`}>
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Thông báo hệ thống</h2>
            {counts.unread > 0 && activeTab !== "unread" && !forcedState && (
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
            ) : counts.unread === 0 ? (
              <Badge tone="neutral">0 chưa đọc</Badge>
            ) : (
              <Badge tone="warning">{counts.unread} chưa đọc</Badge>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid gap-4 border-b border-line p-6 sm:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="notif-search" className="font-medium">
              Tìm kiếm
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
            <label htmlFor="notif-type" className="font-medium">
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
            <label htmlFor="notif-status" className="font-medium">
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
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-line" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-line" />
                      <div className="h-3 w-full animate-pulse rounded bg-line" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-line" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-line px-6 py-4 text-xs text-muted">
              Đang đồng bộ thông báo mới nhất từ cơ sở dữ liệu.
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
        ) : isEffectiveEmpty ? (
          <>
            <div className="p-6">
              <ListState
                kind="empty"
                icon={<BellOff className="h-12 w-12 text-muted stroke-1" />}
                title={
                  activeTab === "unread" && !search
                    ? "Bạn đã đọc hết thông báo"
                    : "Không tìm thấy thông báo"
                }
                description={
                  activeTab === "unread" && !search
                    ? "Không có thông báo chưa đọc. Khi có đơn hàng mới hoặc cảnh báo tồn kho, hệ thống sẽ cập nhật tại đây."
                    : "Không có thông báo nào khớp với bộ lọc hiện tại. Thử chọn điều kiện lọc khác hoặc xóa tìm kiếm."
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
            {items.map((item) => (
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
          "Thông báo chưa đọc vẫn được giữ nguyên. Liên hệ support@petly.vn nếu lỗi tiếp tục xảy ra."
        ) : (
          "Thông báo được lưu trong cơ sở dữ liệu. Chỉ Admin và Staff được xem thông báo vận hành."
        )}
      </footer>
    </div>
  );
}
