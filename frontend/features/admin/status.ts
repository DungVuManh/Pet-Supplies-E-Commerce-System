import type { BadgeTone } from "@/components/workspace/workspace-ui";
import type { CategoryStatus, MasterDataStatus, OrderStatus, PaymentMethod, ProductStatus, UserActivityStatus, UserRole, UserStatus } from "./types";

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

export const masterDataStatusLabels: Record<MasterDataStatus, AdminStatus> = { active: "Hoạt động", inactive: "Tạm ngưng" };

export const productStatusLabels: Record<ProductStatus, AdminStatus> = { active: "Đang bán", low: "Sắp hết hàng", hidden: "Đã ẩn" };

/** The values `Product.petType` stores; the Customer catalog filters on them. */
export const petTypeLabels: Record<string, string> = { dog: "Chó", cat: "Mèo", all: "Tất cả" };

/** "Đang đóng gói" is still part of the "Chờ xử lý" tab. */
export const orderStatusLabels: Record<OrderStatus, AdminStatus> = {
  pending: "Chờ xử lý", confirmed: "Chờ xử lý", processing: "Đang đóng gói", shipping: "Đang giao", completed: "Hoàn thành", cancelled: "Đã hủy",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = { COD: "COD", ONLINE: "VNPay/QR", CASH: "Tiền mặt" };

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
