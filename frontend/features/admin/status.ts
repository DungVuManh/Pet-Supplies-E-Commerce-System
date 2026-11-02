import type { BadgeTone } from "@/components/workspace/workspace-ui";
import type { CategoryStatus, UserActivityStatus, UserRole, UserStatus } from "./types";

/** Every status label shown in the Admin workspace and its badge tone; screens never pick tones themselves. */
export const adminStatusTones = {
  "Hoạt động": "success",
  "Đang bán": "success",
  "Hiển thị": "success",
  "Thành công": "success",
  "Hoàn thành": "success",
  "Đã ghi nhận": "success",
  "Đã đối soát": "success",
  "Đã công bố": "success",
  "Đã chấp nhận": "success",
  "Đủ hàng": "success",
  "Chờ xử lý": "warning",
  "Chờ duyệt": "warning",
  "Chờ đối soát": "warning",
  "Sắp hết hàng": "warning",
  "Sắp hết": "warning",
  "Bản nháp": "warning",
  "Đang giao": "info",
  "Đang đóng gói": "info",
  "Đã khóa": "danger",
  "Bị từ chối": "danger",
  "Đã từ chối": "danger",
  "Đã hủy": "danger",
  "Hết hàng": "danger",
  "Đã ẩn": "neutral",
  "Tạm ngưng": "neutral",
} as const satisfies Record<string, BadgeTone>;

export type AdminStatus = keyof typeof adminStatusTones;

/** Badge label for each `User.status` value. */
export const userStatusLabels: Record<UserStatus, AdminStatus> = { active: "Hoạt động", locked: "Đã khóa" };

export const categoryStatusLabels: Record<CategoryStatus, AdminStatus> = { active: "Hiển thị", hidden: "Đã ẩn" };

export const userRoleLabels: Record<UserRole, string> = { customer: "Customer", staff: "Staff" };

/** Badge label for an order status or an audit result in a user's history. */
export const userActivityStatusLabels: Record<UserActivityStatus, AdminStatus> = {
  pending: "Chờ xử lý",
  confirmed: "Chờ xử lý",
  processing: "Đang đóng gói",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  success: "Thành công",
  denied: "Bị từ chối",
};

export function adminStatusTone(status: AdminStatus): BadgeTone {
  return adminStatusTones[status];
}
