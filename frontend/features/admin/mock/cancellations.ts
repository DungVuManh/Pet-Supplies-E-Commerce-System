import type { AdminStatus } from "../status";

export type CancellationStatus = Extract<AdminStatus, "Chờ duyệt" | "Đã chấp nhận" | "Đã từ chối">;

export type CancellationRequest = {
  id: string;
  orderId: string;
  customer: string;
  requesterRole: "Khách hàng" | "Nhân viên";
  reason: string;
  value: number;
  createdAt: string;
  date: string;
  status: CancellationStatus;
  note?: string;
};

export const initialCancellations: CancellationRequest[] = [
  {
    id: "YC001",
    orderId: "PA261012018",
    customer: "Nguyễn Minh Anh",
    requesterRole: "Khách hàng",
    reason: "Khách đổi ý muốn chọn phân loại khác (chuyển sang vị gà 2 kg)",
    value: 1100000,
    createdAt: "12/10/2026 · 10:48",
    date: "12/10/2026",
    status: "Chờ duyệt",
  },
  {
    id: "YC002",
    orderId: "PA261012016",
    customer: "Lê Quốc Bảo",
    requesterRole: "Khách hàng",
    reason: "Đặt nhầm địa chỉ giao hàng và cần đặt lại",
    value: 450000,
    createdAt: "12/10/2026 · 10:20",
    date: "12/10/2026",
    status: "Chờ duyệt",
  },
  {
    id: "YC003",
    orderId: "PA261012014",
    customer: "Võ Thanh Tùng",
    requesterRole: "Khách hàng",
    reason: "Thời gian giao hàng dự kiến không phù hợp lịch đi công tác",
    value: 420000,
    createdAt: "12/10/2026 · 09:45",
    date: "12/10/2026",
    status: "Chờ duyệt",
  },
  {
    id: "YC004",
    orderId: "PA261012012",
    customer: "Bùi Anh Tuấn",
    requesterRole: "Khách hàng",
    reason: "Trùng đơn đặt hàng trước đó, đã thanh toán qua VNPay",
    value: 960000,
    createdAt: "12/10/2026 · 09:15",
    date: "12/10/2026",
    status: "Đã chấp nhận",
    note: "Đã xác nhận đơn trùng và hoàn tiền qua cổng thanh toán VNPay",
  },
  {
    id: "YC005",
    orderId: "PA261012011",
    customer: "Nguyễn Thảo Vy",
    requesterRole: "Nhân viên",
    reason: "Khách gọi hotline yêu cầu hủy đơn do đã mua tại cửa hàng",
    value: 150000,
    createdAt: "12/10/2026 · 08:52",
    date: "12/10/2026",
    status: "Đã chấp nhận",
    note: "Nhân viên CSKH hỗ trợ xử lý hủy theo yêu cầu qua tổng đài",
  },
  {
    id: "YC006",
    orderId: "PA261012017",
    customer: "Trần Thu Hà",
    requesterRole: "Khách hàng",
    reason: "Yêu cầu hủy sau khi đơn đã hoàn tất đóng gói và xuất kho",
    value: 510000,
    createdAt: "12/10/2026 · 08:30",
    date: "12/10/2026",
    status: "Đã từ chối",
    note: "Đơn hàng đã bàn giao đơn vị vận chuyển, hướng dẫn khách từ chối khi nhận",
  },
];

export function getCancellation(id: string): CancellationRequest | undefined {
  return initialCancellations.find((req) => req.id === id);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function filterCancellations(
  requests: CancellationRequest[],
  filter: { search?: string; status?: string }
): CancellationRequest[] {
  const query = filter.search ? normalize(filter.search) : "";
  const statusFilter = filter.status && filter.status !== "Tất cả" ? filter.status : null;

  return requests.filter((req) => {
    if (statusFilter && req.status !== statusFilter) return false;
    if (!query) return true;

    const searchable = `${req.id} ${req.orderId} ${req.customer} ${req.reason} ${req.requesterRole}`;
    return normalize(searchable).includes(query);
  });
}
