import type {
  StaffOrderDetail,
  StaffOrdersFilterState,
  StaffOrdersListResponse,
  StaffOrderStatusUpdate,
} from "./types";

export class StaffOrdersApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "StaffOrdersApiError";
    this.status = status;
    this.code = code;
  }
}

export function buildOrdersQueryString(filter: StaffOrdersFilterState): string {
  const params = new URLSearchParams();
  if (filter.query && filter.query.trim()) {
    params.set("query", filter.query.trim());
  }
  if (filter.status && filter.status !== "all") {
    params.set("status", filter.status);
  }
  if (filter.dateFrom && filter.dateFrom.trim()) {
    params.set("dateFrom", filter.dateFrom.trim());
  }
  if (filter.dateTo && filter.dateTo.trim()) {
    params.set("dateTo", filter.dateTo.trim());
  }
  if (filter.sort && filter.sort !== "createdAt_desc") {
    params.set("sort", filter.sort);
  }
  if (filter.page && filter.page > 1) {
    params.set("page", String(filter.page));
  }
  return params.toString();
}

export async function fetchStaffOrders(
  filter: StaffOrdersFilterState,
  signal?: AbortSignal
): Promise<StaffOrdersListResponse> {
  const queryStr = buildOrdersQueryString(filter);
  const url = `/api/v1/staff/orders${queryStr ? `?${queryStr}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
    cache: "no-store",
    signal,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const code = json?.error?.code || "REQUEST_FAILED";
    const message = json?.message || `Lỗi yêu cầu (${response.status})`;
    throw new StaffOrdersApiError(response.status, code, message);
  }

  if (!json?.success || !json?.data) {
    throw new StaffOrdersApiError(
      500,
      "INVALID_RESPONSE",
      "Dữ liệu phản hồi không đúng cấu trúc."
    );
  }

  return json.data;
}

export async function fetchStaffOrderDetail(
  origin: string,
  cookieHeader: string,
  id: string
): Promise<StaffOrderDetail> {
  const url = `${origin}/api/v1/staff/orders/${id}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const code = json?.error?.code || "REQUEST_FAILED";
    const message = json?.message || `Lỗi tải đơn hàng (${response.status})`;
    throw new StaffOrdersApiError(response.status, code, message);
  }

  if (!json?.success || !json?.data?.order) {
    throw new StaffOrdersApiError(
      500,
      "INVALID_RESPONSE",
      "Dữ liệu đơn hàng không đúng cấu trúc."
    );
  }

  return json.data.order;
}

const statusMessages: Record<string, string> = {
  ORDER_STATUS_CONFLICT: "Đơn hàng đã thay đổi. Hãy tải lại trước khi cập nhật.",
  INVALID_ORDER_TRANSITION: "Đơn hàng không thể chuyển sang trạng thái đã chọn.",
  PAYMENT_NOT_VERIFIED: "Đơn thanh toán trực tuyến chưa được xác nhận thanh toán.",
  ORDER_NOT_CONFIRMABLE: "Thông tin đơn hàng chưa đầy đủ hoặc không hợp lệ.",
  OUT_OF_STOCK: "Sản phẩm không còn bán hoặc tồn khả dụng không đủ để xác nhận đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  VALIDATION_ERROR: "Thông tin cập nhật chưa hợp lệ. Hãy kiểm tra lại.",
  CSRF_INVALID: "Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.",
};
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
async function statusRequest(path: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(path, { ...options, credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15000) });
  } catch {
    throw new StaffOrdersApiError(0, "NETWORK_ERROR", "Chưa xác nhận được kết quả. Hãy tải lại đơn hàng để kiểm tra.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = record(body) && record(body.error) && typeof body.error.code === "string" ? body.error.code : "REQUEST_FAILED";
    throw new StaffOrdersApiError(response.status, code, statusMessages[code] || "Chưa xác nhận được kết quả. Hãy tải lại đơn hàng để kiểm tra.");
  }
  if (!record(body) || body.success !== true || !record(body.data)) {
    throw new StaffOrdersApiError(502, "INVALID_RESPONSE", "Phản hồi chưa hợp lệ. Hãy tải lại đơn hàng để kiểm tra.");
  }
  return body.data;
}

export async function updateStaffOrderStatus(id: string, input: StaffOrderStatusUpdate) {
  const { csrfToken } = await statusRequest("/api/v1/auth/csrf");
  if (typeof csrfToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(csrfToken)) {
    throw new StaffOrdersApiError(502, "INVALID_RESPONSE", "Phiên gửi biểu mẫu chưa hợp lệ. Hãy tải lại đơn hàng.");
  }
  const { order } = await statusRequest(`/api/v1/staff/orders/${encodeURIComponent(id)}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(input),
  });
  if (!record(order) || order.id !== id || order.orderStatus !== input.orderStatus) {
    throw new StaffOrdersApiError(502, "INVALID_RESPONSE", "Phản hồi chưa hợp lệ. Hãy tải lại đơn hàng để kiểm tra.");
  }
  return { id, orderStatus: input.orderStatus };
}
