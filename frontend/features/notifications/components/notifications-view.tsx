"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import {
  Bell,
  CheckCheck,
  Package,
  RotateCcw,
  Tag,
  Info,
  AlertTriangle,
} from "lucide-react";
import { AccountSidebar } from "@/features/orders/components/account-sidebar";
import { useCustomerNotifications } from "@/features/notifications/hooks/use-customer-notifications";
import type { CustomerNotificationType } from "@/features/notifications/types";

function getNotificationIcon(type: CustomerNotificationType) {
  switch (type) {
    case "order_cancelled":
      return <AlertTriangle className="size-5 text-rose-600" />;
    case "order_confirmed":
    case "order_shipping":
    case "order_completed":
      return <Package className="size-5 text-blue-600" />;
    case "return_approved":
    case "return_received":
    case "return_refunded":
    case "return_rejected":
      return <RotateCcw className="size-5 text-amber-600" />;
    case "voucher_reward":
      return <Tag className="size-5 text-purple-600" />;
    default:
      return <Info className="size-5 text-slate-500" />;
  }
}

type TabFilter = "all" | "orders" | "returns" | "promotions";

export function NotificationsView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useCustomerNotifications();

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "orders") {
      return item.type.startsWith("order_");
    }
    if (activeTab === "returns") {
      return item.type.startsWith("return_");
    }
    if (activeTab === "promotions") {
      return item.type === "voucher_reward";
    }
    return true;
  });

  const handleItemClick = async (id: string, link?: string | null) => {
    await markAsRead(id);
    if (link) {
      router.push(link);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Sidebar tài khoản */}
        <AccountSidebar />

        {/* Nội dung danh sách thông báo */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-muted mb-2 flex items-center gap-1.5"
          >
            <Link href="/" className="hover:text-ink transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href="/account" className="hover:text-ink transition-colors">
              Tài khoản
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">Thông báo</span>
          </nav>

          {/* Tiêu đề & Đánh dấu đã đọc */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
                <Bell className="size-6 text-blue-600" />
                <span>Thông báo của tôi</span>
              </h1>
              <p className="text-xs text-muted mt-1">
                Theo dõi tình trạng đơn hàng, hoàn trả và ưu đãi dành riêng cho bạn.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-blue-600 hover:bg-canvas transition-colors shadow-2xs cursor-pointer"
              >
                <CheckCheck className="size-4" />
                <span>Đánh dấu đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Tabs bộ lọc */}
          <div className="flex items-center gap-2 border-b border-line pb-3 mb-6 overflow-x-auto text-sm">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                activeTab === "all"
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-surface text-muted hover:text-ink border border-line"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                activeTab === "orders"
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-surface text-muted hover:text-ink border border-line"
              }`}
            >
              Đơn hàng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("returns")}
              className={`px-4 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                activeTab === "returns"
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-surface text-muted hover:text-ink border border-line"
              }`}
            >
              Hoàn trả & Hoàn tiền
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("promotions")}
              className={`px-4 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                activeTab === "promotions"
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-surface text-muted hover:text-ink border border-line"
              }`}
            >
              Khuyến mãi
            </button>
          </div>

          {/* Danh sách thông báo */}
          {isLoading && notifications.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted">
              Đang tải danh sách thông báo...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-muted mb-3">
                <Bell className="size-7" />
              </div>
              <p className="font-semibold text-ink text-sm">
                Không có thông báo nào trong mục này
              </p>
              <p className="text-xs text-muted mt-1">
                Các cập nhật mới nhất về đơn hàng hoặc khuyến mãi sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.link)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border border-line bg-surface hover:shadow-sm transition-all cursor-pointer ${
                    !item.read
                      ? "border-blue-200 bg-blue-50/20 shadow-2xs"
                      : "opacity-85"
                  }`}
                >
                  <div className="mt-0.5 shrink-0 rounded-xl bg-canvas p-2.5 border border-line">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm ${
                          !item.read
                            ? "font-bold text-ink"
                            : "font-semibold text-slate-800"
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-xs text-muted shrink-0">
                        {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {item.message}
                    </p>
                    {item.link && (
                      <span className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline">
                        Xem chi tiết →
                      </span>
                    )}
                  </div>
                  {!item.read && (
                    <span className="size-2.5 rounded-full bg-blue-600 shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationsView;

