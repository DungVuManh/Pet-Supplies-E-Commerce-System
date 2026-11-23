// =============================================================
// features/orders/services/reorder.service.ts
// Service gọi API Mua lại đơn hàng đã hoàn thành (POST /api/v1/orders/:id/reorder)
// =============================================================

export class ReorderApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ReorderApiError";
    this.status = status;
    this.code = code;
  }
}

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

export type ReorderItem = {
  productId: string;
  variantSku: string;
  name: string;
  quantity: number;
  price?: number;
  reason?: string;
};

export type ReorderResponseData = {
  orderCode: string;
  addedCount: number;
  unavailableCount: number;
  addedItems: ReorderItem[];
  unavailableItems: ReorderItem[];
};

export async function reorderCompletedOrderApi(id: string): Promise<ReorderResponseData> {
  let csrfResponse: Response;
  try {
    csrfResponse = await fetch("/api/v1/auth/csrf", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ReorderApiError("Chưa thể kết nối tới máy chủ. Vui lòng kiểm tra lại mạng.", 0, "NETWORK_ERROR");
  }

  const csrfBody = await csrfResponse.json().catch(() => null);
  const csrfToken = csrfBody?.data?.csrfToken;
  if (!csrfResponse.ok || typeof csrfToken !== "string" || !csrfPattern.test(csrfToken)) {
    throw new ReorderApiError("Phiên gửi biểu mẫu chưa hợp lệ. Hãy tải lại trang.", 502, "INVALID_RESPONSE");
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1/orders/${encodeURIComponent(id)}/reorder`, {
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
    throw new ReorderApiError("Chưa thực hiện được thao tác mua lại. Vui lòng thử lại sau.", 0, "NETWORK_ERROR");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code || "REQUEST_FAILED";
    const message = body?.message || "Không thể mua lại đơn hàng này.";
    throw new ReorderApiError(message, response.status, code);
  }

  if (body?.success !== true || !body?.data) {
    throw new ReorderApiError("Phản hồi từ máy chủ không hợp lệ.", 502, "INVALID_RESPONSE");
  }

  return body.data as ReorderResponseData;
}
