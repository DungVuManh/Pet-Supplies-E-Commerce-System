"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Package, RotateCcw, Tag, Info, AlertTriangle } from "lucide-react";
import { useCustomerNotifications } from "../hooks/use-customer-notifications";
import type { CustomerNotificationType } from "../types";

function getNotificationIcon(type: CustomerNotificationType) {
  switch (type) {
    case "order_cancelled":
      return <AlertTriangle className="size-4 text-rose-600" />;
    case "order_confirmed":
    case "order_shipping":
    case "order_completed":
      return <Package className="size-4 text-blue-600" />;
    case "return_approved":
    case "return_received":
    case "return_refunded":
    case "return_rejected":
      return <RotateCcw className="size-4 text-amber-600" />;
    case "voucher_reward":
      return <Tag className="size-4 text-purple-600" />;
    default:
      return <Info className="size-4 text-slate-500" />;
  }
}

export function NotificationPopover() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useCustomerNotifications();

  // Đóng khi click ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = async (id: string, link?: string | null) => {
    await markAsRead(id);
    setIsOpen(false);
    if (link) {
      router.push(link);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Thông báo"
        className="relative flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-line bg-surface shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-canvas/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-ink">Thông báo</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-line/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                Bạn chưa có thông báo nào.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.link)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-canvas/60 transition-colors cursor-pointer ${
                    !item.read ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0 rounded-lg bg-surface p-1.5 border border-line">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs leading-snug line-clamp-2 ${
                        !item.read
                          ? "font-bold text-ink"
                          : "font-medium text-slate-700"
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                  {!item.read && (
                    <span className="size-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-line p-2 text-center bg-canvas/30">
            <Link
              href="/account/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:underline py-1 block"
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

