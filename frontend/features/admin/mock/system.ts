import type { AdminStatus } from "../status";
import { matchesQuery } from "./text.ts";

/* -------------------------------------------------------------------------- */
/* 11a. Store Configuration Data                                              */
/* -------------------------------------------------------------------------- */

export type StoreSettings = {
  storeName: string;
  contactEmail: string;
  hotline: string;
  address: string;
  timezone: string;
  currency: string;
  standardShipping: boolean;
  expressShipping: boolean;
  freeShippingThreshold: number;
  codPayment: boolean;
  bankTransfer: boolean;
  vnpay: boolean;
  accountHolder: string;
  emailOrderConfirmation: boolean;
  lowStockAlert: boolean;
  dailyRevenueReport: boolean;
  promoNotification: boolean;
};

export const defaultStoreSettings: StoreSettings = {
  storeName: "Petly – Pet Supplies",
  contactEmail: "hello@petly.vn",
  hotline: "1900 6868",
  address: "28 Nguyễn Thị Minh Khai, Đa Kao, Quận 1, TP. Hồ Chí Minh",
  timezone: "GMT+7 · Việt Nam",
  currency: "VND – Việt Nam đồng",
  standardShipping: true,
  expressShipping: true,
  freeShippingThreshold: 500_000,
  codPayment: true,
  bankTransfer: true,
  vnpay: true,
  accountHolder: "CÔNG TY TNHH PETLY",
  emailOrderConfirmation: true,
  lowStockAlert: true,
  dailyRevenueReport: true,
  promoNotification: false,
};

/* -------------------------------------------------------------------------- */
/* 11b. Store Policies Data                                                   */
/* -------------------------------------------------------------------------- */

export type StorePolicy = {
  id: string;
  code: string;
  title: string;
  status: Extract<AdminStatus, "Đã công bố" | "Bản nháp" | "Tạm ngưng">;
  effectiveDate: string;
  lastUpdated: string;
  content: string;
};

export const defaultPolicies: StorePolicy[] = [
  {
    id: "return",
    code: "POL-RETURN",
    title: "Chính sách đổi trả",
    status: "Đã công bố",
    effectiveDate: "01/10/2026",
    lastUpdated: "10/10/2026 bởi Lê Hoàng Nam",
    content: `1. Điều kiện đổi trả
Khách hàng có thể yêu cầu đổi trả trong 7 ngày kể từ ngày nhận hàng nếu sản phẩm bị lỗi, hư hỏng hoặc giao sai. Sản phẩm cần giữ nguyên bao bì, tem nhãn và kèm hóa đơn mua hàng.

2. Sản phẩm không áp dụng
Không nhận đổi trả thức ăn đã mở bao bì, sản phẩm đã sử dụng hoặc hư hỏng do bảo quản sai. Quy định này không áp dụng với lỗi phát sinh từ nhà sản xuất.

3. Cách gửi yêu cầu
Liên hệ hello@petly.vn hoặc 1900 6868, cung cấp mã đơn, hình ảnh sản phẩm và mô tả lỗi. Petly phản hồi trong 1 ngày làm việc.

4. Phí vận chuyển và hoàn tiền
Petly chịu phí vận chuyển nếu giao sai hoặc sản phẩm lỗi. Sau khi xác nhận, tiền được hoàn về phương thức thanh toán ban đầu trong 3–7 ngày làm việc.`,
  },
  {
    id: "cancellation",
    code: "POL-CANCEL",
    title: "Chính sách hủy đơn",
    status: "Đã công bố",
    effectiveDate: "01/10/2026",
    lastUpdated: "10/10/2026 bởi Lê Hoàng Nam",
    content: `1. Thời gian yêu cầu hủy đơn
Khách hàng có thể gửi yêu cầu hủy đơn hàng trước khi đơn được đóng gói và bàn giao cho đơn vị vận chuyển.

2. Hủy đơn đã thanh toán trước
Đối với các đơn hàng đã thanh toán qua cổng VNPay hoặc chuyển khoản ngân hàng, yêu cầu hủy sau khi được duyệt sẽ được hoàn tiền tự động về tài khoản thanh toán ban đầu.

3. Đơn hàng đang vận chuyển
Sau khi đơn hàng đã xuất kho và có mã vận đơn, khách hàng không thể hủy trực tiếp trên hệ thống mà cần từ chối nhận hàng khi shipper giao tới.`,
  },
  {
    id: "refund",
    code: "POL-REFUND",
    title: "Chính sách hoàn tiền",
    status: "Đã công bố",
    effectiveDate: "01/10/2026",
    lastUpdated: "10/10/2026 bởi Lê Hoàng Nam",
    content: `1. Thời gian xử lý hoàn tiền
Tiền hoàn sẽ được chuyển về tài khoản ban đầu trong thời gian từ 3 đến 7 ngày làm việc tùy thuộc vào ngân hàng thụ hưởng.

2. Phương thức hoàn tiền
- Thanh toán VNPay: Hoàn trực tiếp qua cổng thanh toán VNPay.
- Thanh toán chuyển khoản: Chuyển khoản hoàn tiền theo số tài khoản khách hàng cung cấp.
- Thanh toán COD: Hoàn tiền qua tài khoản ngân hàng chính chủ của khách.

3. Phí hoàn tiền
Petly miễn phí toàn bộ chi phí phát sinh trong quá trình xử lý hoàn tiền cho khách hàng.`,
  },
  {
    id: "privacy",
    code: "POL-PRIVACY",
    title: "Chính sách bảo mật",
    status: "Đã công bố",
    effectiveDate: "01/10/2026",
    lastUpdated: "08/10/2026 bởi Lê Hoàng Nam",
    content: `1. Thu thập thông tin
Chúng tôi chỉ thu thập các thông tin cần thiết phục vụ cho việc giao hàng và chăm sóc khách hàng: họ tên, số điện thoại, địa chỉ nhận hàng và email.

2. Mục đích sử dụng
Thông tin khách hàng chỉ được dùng để xác nhận đơn hàng, giao hàng và thông báo trạng thái vận đơn. Tuyệt đối không chia sẻ cho bên thứ ba vì mục đích quảng cáo khi chưa có sự đồng ý.

3. Bảo mật thanh toán
Mọi thông tin thẻ và tài khoản ngân hàng được xử lý bảo mật tuyệt đối qua cổng thanh toán đạt tiêu chuẩn PCI-DSS.`,
  },
];

/* -------------------------------------------------------------------------- */
/* 11c. Audit Log Data                                                        */
/* -------------------------------------------------------------------------- */

export type AuditLogEntry = {
  id: string;
  time: string;
  fullTime: string;
  actor: string;
  action: string;
  detail: string;
  ip: string;
  target: string;
  result: Extract<AdminStatus, "Thành công" | "Bị từ chối">;
};

export const auditLogEntries: AuditLogEntry[] = [
  {
    id: "log-001",
    time: "12/10 · 10:15",
    fullTime: "2026 · 10:15:42",
    actor: "Phạm Thu Hà",
    action: "Cập nhật tồn kho",
    detail: "120 túi (trước: 124)",
    ip: "14.161.28.10",
    target: "RC-MA-2KG",
    result: "Thành công",
  },
  {
    id: "log-002",
    time: "12/10 · 09:52",
    fullTime: "2026 · 09:52:18",
    actor: "Lê Hoàng Nam",
    action: "Khóa tài khoản",
    detail: "Lý do: yêu cầu xác minh",
    ip: "14.161.28.10",
    target: "KH0003",
    result: "Thành công",
  },
  {
    id: "log-003",
    time: "11/10 · 16:30",
    fullTime: "2026 · 16:30:05",
    actor: "Vũ Đức Long",
    action: "Duyệt yêu cầu hủy",
    detail: "Khách đặt nhầm sản phẩm",
    ip: "14.161.28.12",
    target: "PA261011009",
    result: "Thành công",
  },
  {
    id: "log-004",
    time: "10/10 · 14:20",
    fullTime: "2026 · 14:20:11",
    actor: "Lê Hoàng Nam",
    action: "Công bố chính sách",
    detail: "Chính sách đổi trả · Phiên bản 2.1",
    ip: "14.161.28.10",
    target: "POL-RETURN",
    result: "Thành công",
  },
  {
    id: "log-005",
    time: "10/10 · 11:08",
    fullTime: "2026 · 11:08:34",
    actor: "Phạm Thu Hà",
    action: "Xóa sản phẩm",
    detail: "Không được phép: sản phẩm đã có đơn hàng",
    ip: "14.161.28.10",
    target: "RC-IN-2KG",
    result: "Bị từ chối",
  },
  {
    id: "log-006",
    time: "09/10 · 08:45",
    fullTime: "2026 · 08:45:02",
    actor: "Lê Hoàng Nam",
    action: "Cập nhật cấu hình",
    detail: "Miễn phí vận chuyển từ 500.000 đ",
    ip: "14.161.28.10",
    target: "CFG-SHIP",
    result: "Thành công",
  },
];

/** Admin screen for the record a log entry changed: users, orders, policies, settings, otherwise a product SKU. */
export function auditTargetHref(target: string) {
  if (/^(KH|NV)\d+$/.test(target)) return `/admin/users/${target}`;
  if (/^PA\d+$/.test(target)) return `/admin/orders?q=${target}`;
  if (target.startsWith("POL-")) return "/admin/system/policies";
  if (target.startsWith("CFG-")) return "/admin/system/settings";
  return `/admin/products/${target}`;
}

export function filterAuditLog(
  entries: AuditLogEntry[],
  filter: { search?: string; action?: string }
): AuditLogEntry[] {
  const query = filter.search ?? "";
  const actionFilter = filter.action && filter.action !== "Tất cả hành động" ? filter.action : null;

  return entries.filter((entry) => {
    if (actionFilter && entry.action !== actionFilter) return false;
    if (!query) return true;
    const searchable = `${entry.actor} ${entry.target} ${entry.action} ${entry.detail} ${entry.ip}`;
    return matchesQuery(query, searchable);
  });
}
