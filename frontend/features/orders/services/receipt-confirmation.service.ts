export class OrderReceiptApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "OrderReceiptApiError";
    this.status = status;
    this.code = code;
  }
}

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

const messages: Record<string, string> = {
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  INVALID_ORDER_TRANSITION: "Đơn hàng chưa thể xác nhận đã nhận.",
  ORDER_STATUS_CONFLICT: "Trạng thái đơn đã thay đổi. Hãy tải lại đơn hàng.",
  CSRF_INVALID: "Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.",
};

export async function confirmOrderReceiptApi(id: string) {
  let csrfResponse: Response;
  try {
    csrfResponse = await fetch("/api/v1/auth/csrf", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new OrderReceiptApiError("Chưa thể kết nối tới máy chủ. Vui lòng thử lại.", 0, "NETWORK_ERROR");
  }
  const csrfBody = await csrfResponse.json().catch(() => null);
  const csrfToken = csrfBody?.data?.csrfToken;
  if (!csrfResponse.ok || typeof csrfToken !== "string" || !csrfPattern.test(csrfToken)) {
    throw new OrderReceiptApiError("Phiên gửi biểu mẫu chưa hợp lệ. Hãy tải lại đơn hàng.", 502, "INVALID_RESPONSE");
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1/orders/${encodeURIComponent(id)}/receipt-confirmation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      credentials: "include",
      cache: "no-store",
      body: "{}",
    });
  } catch {
    throw new OrderReceiptApiError("Chưa xác nhận được kết quả. Hãy tải lại đơn hàng để kiểm tra.", 0, "NETWORK_ERROR");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "REQUEST_FAILED";
    throw new OrderReceiptApiError(
      messages[code] || "Chưa xác nhận được kết quả. Hãy tải lại đơn hàng để kiểm tra.",
      response.status,
      code,
    );
  }
  if (body?.success !== true || body?.data?.order?.id !== id || body.data.order.orderStatus !== "completed") {
    throw new OrderReceiptApiError("Phản hồi chưa hợp lệ. Hãy tải lại đơn hàng để kiểm tra.", 502, "INVALID_RESPONSE");
  }
  return { id, orderStatus: "completed" as const };
}
