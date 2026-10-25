import { matchesQuery } from "./text.ts";
export type NotificationType = "order" | "stock" | "system";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  createdAt: string;
  read: boolean;
  saved: boolean;
  targetHref?: string;
  reference?: string;
};

export const initialNotifications: NotificationItem[] = [
  {
    id: "NT-001",
    type: "order",
    title: "Đơn hàng mới #PA261012018 cần xử lý",
    detail: "Khách hàng Nguyễn Minh Anh đã đặt đơn hàng trị giá 1.100.000 ₫ (COD). Đơn đang ở trạng thái chờ đóng gói.",
    createdAt: "12/10/2026 · 10:42",
    read: false,
    saved: false,
    targetHref: "/admin/orders?q=PA261012018",
    reference: "#PA261012018",
  },
  {
    id: "NT-002",
    type: "stock",
    title: "Cảnh báo tồn kho: Cát vệ sinh Catsan 10 L dưới định mức",
    detail: "Tồn kho khả dụng hiện tại là 8 bao, dưới ngưỡng cảnh báo an toàn 20 bao. Cần tạo phiếu nhập bổ sung.",
    createdAt: "12/10/2026 · 10:15",
    read: false,
    saved: true,
    targetHref: "/admin/inventory",
    reference: "SKU: CT-BEN-10L",
  },
  {
    id: "NT-003",
    type: "order",
    title: "Yêu cầu hủy đơn hàng cho đơn #PA261012016",
    detail: "Khách hàng Lê Quốc Bảo yêu cầu hủy đơn với lý do: Đặt nhầm địa chỉ giao hàng và phương thức thanh toán.",
    createdAt: "12/10/2026 · 09:45",
    read: false,
    saved: false,
    targetHref: "/admin/cancellations",
    reference: "YC002",
  },
  {
    id: "NT-004",
    type: "system",
    title: "Sao lưu cơ sở dữ liệu định kỳ hoàn tất",
    detail: "Bản sao lưu tự động ngày 12/10/2026 đã được lưu trữ an toàn trên máy chủ lưu trữ dự phòng.",
    createdAt: "12/10/2026 · 04:00",
    read: true,
    saved: false,
    targetHref: "/admin/system/audit-log",
    reference: "Hệ thống",
  },
  {
    id: "NT-005",
    type: "stock",
    title: "Nhập kho thành công 100 gói Pate Whiskas cá ngừ",
    detail: "Thủ kho Trần Văn Hùng đã hoàn tất xác nhận phiếu nhập PN-261011-003 từ nhà cung cấp Whiskas.",
    createdAt: "11/10/2026 · 15:30",
    read: true,
    saved: true,
    targetHref: "/admin/inventory",
    reference: "PN-261011-003",
  },
  {
    id: "NT-006",
    type: "system",
    title: "Cập nhật chính sách cửa hàng thành công",
    detail: "Chính sách đổi trả phiên bản 2.4 đã được quản trị viên duyệt và công bố công khai trên toàn hệ thống.",
    createdAt: "11/10/2026 · 11:00",
    read: true,
    saved: false,
    targetHref: "/admin/system/policies",
    reference: "Chính sách",
  },
];

export const notificationTypeLabels: Record<NotificationType, string> = {
  order: "Đơn hàng",
  stock: "Kho hàng",
  system: "Hệ thống",
};

export function filterNotifications(
  items: NotificationItem[],
  filter: {
    tab?: "unread" | "all" | "saved";
    search?: string;
    type?: string;
    status?: string;
  }
): NotificationItem[] {
  const query = filter.search ?? "";
  const typeFilter =
    filter.type && filter.type !== "Tất cả"
      ? (Object.entries(notificationTypeLabels).find(([, label]) => label === filter.type)?.[0] as NotificationType)
      : null;

  return items.filter((item) => {
    // Tab filter
    if (filter.tab === "unread" && item.read) return false;
    if (filter.tab === "saved" && !item.saved) return false;

    // Type filter
    if (typeFilter && item.type !== typeFilter) return false;

    // Status filter dropdown
    if (filter.status === "Chưa đọc" && item.read) return false;
    if (filter.status === "Đã đọc" && !item.read) return false;

    // Search query
    if (!query) return true;
    const searchable = `${item.title} ${item.detail} ${item.reference || ""} ${notificationTypeLabels[item.type]}`;
    return matchesQuery(query, searchable);
  });
}

export function unreadNotificationsCount(items: NotificationItem[]): number {
  return items.filter((item) => !item.read).length;
}
