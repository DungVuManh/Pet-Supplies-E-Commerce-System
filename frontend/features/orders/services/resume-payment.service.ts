import type { CustomerOrderPaymentSession } from "../types";

export class ResumePaymentApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ResumePaymentApiError";
    this.status = status;
    this.code = code;
  }
}

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

const errorMessages: Record<string, string> = {
  UNAUTHENTICATED: "Vui lòng đăng nhập để tiếp tục thanh toán đơn hàng.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác thanh toán cho đơn hàng này.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng hoặc đơn hàng không thuộc tài khoản của bạn.",
  VALIDATION_ERROR: "Mã đơn hàng không hợp lệ.",
  ORDER_CANCELLED: "Đơn hàng đã bị hủy, không thể tiếp tục thanh toán.",
  ORDER_ALREADY_PAID: "Đơn hàng này đã được thanh toán hoàn tất.",
  PAYMENT_METHOD_NOT_ONLINE: "Đơn hàng này không dùng phương thức chuyển khoản trực tuyến.",
  OFFLINE_ORDER: "Đơn hàng tại quầy không hỗ trợ thanh toán trực tuyến.",
  ORDER_STATUS_CONFLICT: "Trạng thái đơn hàng vừa thay đổi. Vui lòng tải lại trang.",
  CSRF_INVALID: "Phiên gửi yêu cầu đã hết hạn. Vui lòng thử lại.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveErrorCode(body: unknown, status: number): string {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.code === "string") {
    return body.error.code;
  }
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  return "REQUEST_FAILED";
}

async function fetchCsrfToken(): Promise<string> {
  let csrfResponse: Response;
  try {
    csrfResponse = await fetch("/api/v1/auth/csrf", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ResumePaymentApiError(
      "Chưa thể kết nối tới máy chủ. Vui lòng thử lại.",
      0,
      "NETWORK_ERROR"
    );
  }

  const csrfBody: unknown = await csrfResponse.json().catch(() => null);
  const csrfToken =
    isRecord(csrfBody) && isRecord(csrfBody.data)
      ? csrfBody.data.csrfToken
      : undefined;

  if (
    !csrfResponse.ok ||
    typeof csrfToken !== "string" ||
    !csrfPattern.test(csrfToken)
  ) {
    throw new ResumePaymentApiError(
      "Phiên làm việc chưa hợp lệ. Hãy tải lại trang để tiếp tục.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return csrfToken;
}

async function postPaymentMutation(
  url: string,
  networkMessage: string,
  fallbackMessage: string
): Promise<Record<string, unknown>> {
  const csrfToken = await fetchCsrfToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
      body: "{}",
    });
  } catch {
    throw new ResumePaymentApiError(networkMessage, 0, "NETWORK_ERROR");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = resolveErrorCode(body, response.status);
    throw new ResumePaymentApiError(
      errorMessages[code] || fallbackMessage,
      response.status,
      code
    );
  }

  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new ResumePaymentApiError(
      "Phản hồi máy chủ chưa hợp lệ. Hãy tải lại trang để kiểm tra.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return body.data;
}

export async function getOrderPaymentSessionApi(
  orderId: string
): Promise<CustomerOrderPaymentSession> {
  let response: Response;
  try {
    response = await fetch(
      `/api/v1/orders/${encodeURIComponent(orderId)}/payment`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );
  } catch {
    throw new ResumePaymentApiError(
      "Chưa thể tải thông tin thanh toán. Vui lòng kiểm tra kết nối và thử lại.",
      0,
      "NETWORK_ERROR"
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = resolveErrorCode(body, response.status);
    throw new ResumePaymentApiError(
      errorMessages[code] || "Không thể tải thông tin thanh toán cho đơn hàng này.",
      response.status,
      code
    );
  }

  const session =
    isRecord(body) && isRecord(body.data) ? body.data.session : undefined;

  if (
    !isRecord(body) ||
    body.success !== true ||
    !isRecord(session) ||
    typeof session.orderCode !== "string" ||
    typeof session.state !== "string"
  ) {
    throw new ResumePaymentApiError(
      "Dữ liệu phiên thanh toán chưa hợp lệ. Vui lòng tải lại trang.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return session as unknown as CustomerOrderPaymentSession;
}

export async function renewOrderPaymentSessionApi(orderId: string): Promise<{
  orderId: string;
  orderCode: string;
  paymentExpiredAt: string;
  secondsLeft: number;
}> {
  const data = await postPaymentMutation(
    `/api/v1/orders/${encodeURIComponent(orderId)}/payment/renew`,
    "Chưa thể gia hạn mã thanh toán. Hãy tải lại trang để kiểm tra.",
    "Không thể gia hạn phiên thanh toán. Vui lòng thử lại."
  );

  if (
    data.orderId !== orderId ||
    typeof data.secondsLeft !== "number" ||
    typeof data.paymentExpiredAt !== "string"
  ) {
    throw new ResumePaymentApiError(
      "Phản hồi gia hạn phiên thanh toán chưa hợp lệ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return {
    orderId: data.orderId,
    orderCode: typeof data.orderCode === "string" ? data.orderCode : "",
    paymentExpiredAt: data.paymentExpiredAt,
    secondsLeft: data.secondsLeft,
  };
}

export async function convertOrderToCodApi(orderId: string): Promise<{
  orderId: string;
  orderCode: string;
  paymentMethod: "COD";
  paymentStatus: "unpaid";
}> {
  const data = await postPaymentMutation(
    `/api/v1/orders/${encodeURIComponent(orderId)}/payment/convert-to-cod`,
    "Chưa xác nhận được kết quả chuyển COD. Hãy tải lại trang để kiểm tra.",
    "Không thể chuyển sang phương thức COD."
  );

  if (data.orderId !== orderId || data.paymentMethod !== "COD") {
    throw new ResumePaymentApiError(
      "Phản hồi chuyển sang COD chưa hợp lệ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return {
    orderId: data.orderId,
    orderCode: typeof data.orderCode === "string" ? data.orderCode : "",
    paymentMethod: "COD",
    paymentStatus: "unpaid",
  };
}
