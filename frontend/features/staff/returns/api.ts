// =============================================================
// features/staff/returns/api.ts
// Client API tương tác với endpoint Staff Returns Backend
// =============================================================

import type {
  StaffReturnDetail,
  StaffReturnsListResponse,
  StaffReturnStatus,
} from "./types";

export class StaffReturnApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "StaffReturnApiError";
    this.status = status;
    this.code = code;
  }
}

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

const staffErrorMessages: Record<string, string> = {
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng tương ứng.",
  RETURN_NOT_FOUND: "Không tìm thấy yêu cầu hoàn trả.",
  RETURN_REQUEST_ALREADY_REVIEWED: "Yêu cầu hoàn trả này đã được nhân viên khác xử lý trước đó.",
  RETURN_DECISION_CONFLICT: "Yêu cầu hoàn trả đã có thay đổi. Vui lòng tải lại trang.",
  INVALID_ORDER_TRANSITION: "Trạng thái đơn hàng không hợp lệ để xử lý hoàn trả.",
  VALIDATION_ERROR: "Thông tin xử lý không hợp lệ.",
  CSRF_INVALID: "Phiên làm việc đã hết hạn. Vui lòng thử lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  UNAUTHENTICATED: "Vui lòng đăng nhập để tiếp tục.",
};

async function fetchCsrfToken(): Promise<string> {
  let csrfResponse: Response;
  try {
    csrfResponse = await fetch("/api/v1/auth/csrf", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new StaffReturnApiError(
      "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.",
      0,
      "NETWORK_ERROR"
    );
  }

  const csrfBody = await csrfResponse.json().catch(() => null);
  const csrfToken = csrfBody?.data?.csrfToken;
  if (!csrfResponse.ok || typeof csrfToken !== "string" || !csrfPattern.test(csrfToken)) {
    throw new StaffReturnApiError(
      "Phiên làm việc chưa hợp lệ. Vui lòng tải lại trang.",
      502,
      "INVALID_RESPONSE"
    );
  }
  return csrfToken;
}

/**
 * Lấy danh sách yêu cầu hoàn trả cho Staff
 */
export async function fetchStaffReturns(params?: {
  status?: StaffReturnStatus;
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<StaffReturnsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }
  if (params?.query?.trim()) {
    searchParams.set("query", params.query.trim());
  }
  if (params?.page) {
    searchParams.set("page", String(params.page));
  }
  if (params?.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const url = `/api/v1/staff/returns${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new StaffReturnApiError(
      "Không thể tải danh sách hoàn trả. Vui lòng thử lại.",
      0,
      "NETWORK_ERROR"
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "FETCH_FAILED";
    const msg = body?.message || staffErrorMessages[code] || "Lỗi tải danh sách yêu cầu hoàn trả.";
    throw new StaffReturnApiError(msg, response.status, code);
  }

  if (!body?.success || !body?.data?.items) {
    throw new StaffReturnApiError(
      "Dữ liệu danh sách yêu cầu hoàn trả không hợp lệ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return body.data as StaffReturnsListResponse;
}

/**
 * Lấy chi tiết yêu cầu hoàn trả & ảnh minh chứng
 */
export async function fetchStaffReturnDetail(id: string): Promise<StaffReturnDetail> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/staff/returns/${encodeURIComponent(id)}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new StaffReturnApiError(
      "Không thể tải chi tiết hoàn trả. Vui lòng thử lại.",
      0,
      "NETWORK_ERROR"
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "FETCH_FAILED";
    const msg = body?.message || staffErrorMessages[code] || "Không tìm thấy yêu cầu hoàn trả.";
    throw new StaffReturnApiError(msg, response.status, code);
  }

  if (!body?.success || !body?.data) {
    throw new StaffReturnApiError(
      "Dữ liệu chi tiết yêu cầu hoàn trả không hợp lệ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return body.data as StaffReturnDetail;
}

/**
 * Lấy chi tiết yêu cầu hoàn trả phía Server (SSR Next.js)
 */
export async function fetchStaffReturnDetailServer(
  origin: string,
  cookieHeader: string,
  id: string
): Promise<StaffReturnDetail> {
  let response: Response;
  try {
    response = await fetch(`${origin}/api/v1/staff/returns/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
  } catch {
    throw new StaffReturnApiError(
      "Không thể kết nối đến máy chủ khi tải chi tiết hoàn trả.",
      0,
      "NETWORK_ERROR"
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "FETCH_FAILED";
    const msg = body?.message || staffErrorMessages[code] || "Không tìm thấy yêu cầu hoàn trả.";
    throw new StaffReturnApiError(msg, response.status, code);
  }

  if (!body?.success || !body?.data) {
    throw new StaffReturnApiError(
      "Dữ liệu chi tiết yêu cầu hoàn trả không hợp lệ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return body.data as StaffReturnDetail;
}

export type StaffReturnDecisionPayload = {
  action?: "approve_request" | "reject_request" | "complete_refund" | "reject_refund";
  decision?: "approve" | "reject";
  rejectionReason?: string;
  refundAmount?: number;
};

/**
 * Staff xác nhận đã nhận được kiện hàng trả về từ khách hàng
 */
export async function receiveStaffReturn(
  id: string
): Promise<{ orderId: string; status: "received" }> {
  const csrfToken = await fetchCsrfToken();

  let response: Response;
  try {
    response = await fetch(`/api/v1/staff/returns/${encodeURIComponent(id)}/receive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new StaffReturnApiError(
      "Không thể xác nhận nhận hàng. Hãy tải lại trang để kiểm tra.",
      0,
      "NETWORK_ERROR"
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "RECEIVE_FAILED";
    const msg = body?.message || staffErrorMessages[code] || "Xác nhận nhận hàng thất bại.";
    throw new StaffReturnApiError(msg, response.status, code);
  }

  if (!body?.success || !body?.data?.status) {
    throw new StaffReturnApiError(
      "Phản hồi xác nhận nhận hàng không hợp lệ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return body.data;
}

/**
 * Staff phê duyệt hoặc từ chối yêu cầu hoàn trả (hỗ trợ 4 giai đoạn)
 */
export async function submitStaffReturnDecision(
  id: string,
  payload: StaffReturnDecisionPayload
): Promise<{ orderId: string; decision?: "approve" | "reject"; status: string }> {
  const csrfToken = await fetchCsrfToken();

  let response: Response;
  try {
    response = await fetch(`/api/v1/staff/returns/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new StaffReturnApiError(
      "Không thể gửi quyết định. Hãy tải lại trang để kiểm tra.",
      0,
      "NETWORK_ERROR"
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "DECISION_FAILED";
    const msg = body?.message || staffErrorMessages[code] || "Xử lý yêu cầu hoàn trả thất bại.";
    throw new StaffReturnApiError(msg, response.status, code);
  }

  if (!body?.success || !body?.data?.status) {
    throw new StaffReturnApiError(
      "Phản hồi xử lý yêu cầu hoàn trả không hợp lệ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return body.data;
}
