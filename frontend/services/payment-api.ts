// =============================================================
// frontend/services/payment-api.ts
// Các hàm gọi API dịch vụ thanh toán SePay và VietQR
// =============================================================

function getPaymentsApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, "");
    return clean.endsWith("/api/v1") ? `${clean}/payments` : `${clean}/api/v1/payments`;
  }
  return "/api/v1/payments";
}

export type SepayPaymentInfo = {
  orderCode: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  memo: string;
  qrUrl: string;
  qrPayload?: string;
  paymentExpiredAt: string;
  secondsLeft: number;
  isExpired: boolean;
  isPaid: boolean;
};

export type SepayPaymentStatus = {
  orderCode: string;
  paymentMethod: string;
  paymentStatus: "unpaid" | "pending" | "paid" | "failed";
  orderStatus: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  isPaid: boolean;
  isExpired: boolean;
  needsReview: boolean;
};

/**
 * Lấy chi tiết thông tin thanh toán VietQR động cho đơn hàng
 */
export async function getSepayPaymentInfo(orderCode: string): Promise<SepayPaymentInfo> {
  const response = await fetch(`${getPaymentsApiBase()}/sepay/info/${encodeURIComponent(orderCode)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Không thể tải thông tin thanh toán.");
  }

  return json.data;
}

/**
 * Truy vấn trạng thái thanh toán thời gian thực (Polling endpoint)
 */
export async function getSepayPaymentStatus(orderCode: string): Promise<SepayPaymentStatus> {
  const response = await fetch(`${getPaymentsApiBase()}/status/${encodeURIComponent(orderCode)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Không thể kiểm tra trạng thái thanh toán.");
  }

  return json.data;
}

/**
 * Gia hạn phiên thanh toán VietQR thêm 15 phút
 */
export async function renewSepaySession(orderCode: string): Promise<{ paymentExpiredAt: string; secondsLeft: number }> {
  const response = await fetch(`${getPaymentsApiBase()}/renew-session/${encodeURIComponent(orderCode)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Không thể gia hạn phiên thanh toán.");
  }

  return json.data;
}

/**
 * Chuyển đổi phương thức thanh toán sang COD khi mã QR hết hạn
 */
export async function convertOrderToCod(orderCode: string): Promise<{ orderCode: string; paymentMethod: string }> {
  const response = await fetch(`${getPaymentsApiBase()}/convert-to-cod/${encodeURIComponent(orderCode)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Không thể chuyển sang hình thức COD.");
  }

  return json.data;
}
