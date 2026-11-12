// =============================================================
// frontend/features/orders/services/order-return.service.ts
// Service API cho khách hàng gửi yêu cầu hoàn trả đơn hàng
// =============================================================

import type { ReturnRequestReason, CustomerOrderReturnRequest } from "../types";

export class OrderReturnApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "OrderReturnApiError";
    this.status = status;
    this.code = code;
  }
}

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

const returnMessages: Record<string, string> = {
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  INVALID_ORDER_STATUS: "Chỉ có thể yêu cầu hoàn trả khi đơn hàng đang giao.",
  DUPLICATE_RETURN_REQUEST: "Đơn hàng đã có yêu cầu hoàn trả.",
  RETURN_REQUEST_ACTIVE: "Đơn hàng đang có yêu cầu hoàn trả chưa thể xử lý lại.",
  INVALID_ORDER_TRANSITION: "Trạng thái đơn hàng không hợp lệ để gửi yêu cầu hoàn trả.",
  RETURN_REQUEST_CONFLICT: "Không thể gửi yêu cầu hoàn trả vào lúc này. Vui lòng thử lại.",
  VALIDATION_ERROR: "Thông tin hoàn trả chưa hợp lệ. Vui lòng kiểm tra lại lý do, mô tả và hình ảnh.",
  NO_FILES: "Vui lòng chọn ít nhất 1 ảnh minh chứng.",
  TOO_MANY_FILES: "Chỉ được tải lên tối đa 5 ảnh cho mỗi yêu cầu.",
  INVALID_FILE_TYPE: "Chỉ chấp nhận tệp hình ảnh định dạng JPG, PNG hoặc WEBP.",
  FILE_TOO_LARGE: "Mỗi hình ảnh không được vượt quá 5MB.",
  CSRF_INVALID: "Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.",
  UNSUPPORTED_MEDIA_TYPE: "Định dạng dữ liệu gửi lên không đúng yêu cầu.",
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
    throw new OrderReturnApiError(
      "Chưa thể kết nối tới máy chủ. Vui lòng thử lại.",
      0,
      "NETWORK_ERROR"
    );
  }

  const csrfBody = await csrfResponse.json().catch(() => null);
  const csrfToken = csrfBody?.data?.csrfToken;
  if (!csrfResponse.ok || typeof csrfToken !== "string" || !csrfPattern.test(csrfToken)) {
    throw new OrderReturnApiError(
      "Phiên gửi biểu mẫu chưa hợp lệ. Hãy tải lại đơn hàng.",
      502,
      "INVALID_RESPONSE"
    );
  }
  return csrfToken;
}

/**
 * Tải lên danh sách 1-5 ảnh minh chứng lên Cloudinary qua Backend
 */
export async function uploadReturnImagesApi(
  orderId: string,
  files: File[]
): Promise<{ urls: string[] }> {
  if (!Array.isArray(files) || files.length === 0) {
    throw new OrderReturnApiError("Vui lòng chọn ít nhất 1 ảnh.", 400, "NO_FILES");
  }

  if (files.length > 5) {
    throw new OrderReturnApiError("Chỉ được tải lên tối đa 5 ảnh.", 400, "TOO_MANY_FILES");
  }

  const csrfToken = await fetchCsrfToken();
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/return/upload`, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
      body: formData,
    });
  } catch {
    throw new OrderReturnApiError(
      "Không thể tải ảnh lên. Vui lòng kiểm tra kết nối mạng và thử lại.",
      0,
      "NETWORK_ERROR"
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "UPLOAD_FAILED";
    const message = body?.message || returnMessages[code] || "Tải ảnh minh chứng thất bại.";
    throw new OrderReturnApiError(message, response.status, code);
  }

  const urls = body?.data?.urls;
  if (!body?.success || !Array.isArray(urls)) {
    throw new OrderReturnApiError(
      "Phản hồi tải ảnh không hợp lệ từ máy chủ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return { urls };
}

/**
 * Gửi yêu cầu hoàn trả đơn hàng
 */
export async function submitOrderReturnApi(
  orderId: string,
  payload: {
    reason: ReturnRequestReason;
    bankAccount: {
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    };
    description: string;
    images?: string[];
  }
): Promise<{ returnRequest: Partial<CustomerOrderReturnRequest> }> {
  const csrfToken = await fetchCsrfToken();

  let response: Response;
  try {
    response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/return`, {
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
    throw new OrderReturnApiError(
      "Chưa thể gửi yêu cầu hoàn trả. Hãy tải lại trang để kiểm tra.",
      0,
      "NETWORK_ERROR"
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "REQUEST_FAILED";
    const message = body?.message || returnMessages[code] || "Gửi yêu cầu hoàn trả thất bại.";
    throw new OrderReturnApiError(message, response.status, code);
  }

  const returnRequest = body?.data?.returnRequest;
  if (!body?.success || !returnRequest) {
    throw new OrderReturnApiError(
      "Phản hồi yêu cầu hoàn trả chưa hợp lệ.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return { returnRequest };
}

