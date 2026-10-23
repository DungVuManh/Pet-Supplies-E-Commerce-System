import type { BadgeTone } from "../workspace/components/workspace-ui";

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
  "Đã khóa": "danger",
  "Bị từ chối": "danger",
  "Đã từ chối": "danger",
  "Đã hủy": "danger",
  "Hết hàng": "danger",
  "Đã ẩn": "neutral",
  "Tạm ngưng": "neutral",
} as const satisfies Record<string, BadgeTone>;

export type AdminStatus = keyof typeof adminStatusTones;

export function adminStatusTone(status: AdminStatus): BadgeTone {
  return adminStatusTones[status];
}
