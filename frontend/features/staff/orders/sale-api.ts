export type SaleCustomer = { id: string; fullName: string; phone: string; email: string };
export type SaleProduct = { productId: string; sku: string; name: string; variantLabel: string;
  price: number; availableStock: number };
export type SaleLine = SaleProduct & { qty: number };
export type SaleInput = {
  customerId?: string;
  customer?: { name: string; phone: string; email?: string };
  items: { sku: string; qty: number; expectedPrice: number }[];
  cashReceived: true;
};
export type SaleReceipt = { id: string; orderCode: string; total: number; channel: "offline";
  orderStatus: "completed"; paymentStatus: "paid"; paymentMethod: "CASH" };
export type Lookup<T> = { items: T[]; page: number; hasMore: boolean };

const messages: Record<string, string> = {
  OUT_OF_STOCK: "Tồn kho không đủ. Hãy kiểm tra số lượng và chọn lại sản phẩm.",
  CATALOG_CHANGED: "Sản phẩm hoặc giá bán đã thay đổi. Hãy xóa và chọn lại sản phẩm.",
  CUSTOMER_NOT_FOUND: "Khách hàng không còn khả dụng. Hãy chọn lại khách hàng.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu này đã tạo đơn trước đó. Hãy kiểm tra kết quả.",
  CSRF_INVALID: "Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.",
  TRANSACTIONS_REQUIRED: "Máy chủ chưa hỗ trợ lưu đơn an toàn. Cần cấu hình MongoDB replica set hoặc Atlas.",
  VALIDATION_ERROR: "Thông tin đơn hàng chưa hợp lệ. Hãy kiểm tra lại.",
};
export class SaleApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(messages[code] || "Chưa thể xác nhận kết quả. Vui lòng thử lại.");
    this.status = status;
    this.code = code;
  }
}
function record(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function text(v: unknown): v is string { return typeof v === "string"; }
function integer(v: unknown): v is number { return Number.isSafeInteger(v) && Number(v) >= 0; }
function id(v: unknown): v is string { return text(v) && /^[a-f\d]{24}$/i.test(v); }
function invalid(): never { throw new SaleApiError(502, "INVALID_RESPONSE"); }
function data(body: unknown): Record<string, unknown> {
  if (!record(body) || body.success !== true || !record(body.data)) return invalid();
  return body.data;
}
export function parseSaleReceipt(body: unknown): SaleReceipt {
  const order = data(body).order;
  if (!record(order) || !id(order.id) || !text(order.orderCode) || !order.orderCode
    || !integer(order.total) || order.channel !== "offline" || order.orderStatus !== "completed"
    || order.paymentStatus !== "paid" || order.paymentMethod !== "CASH") return invalid();
  return { id: order.id, orderCode: order.orderCode, total: order.total, channel: "offline",
    orderStatus: "completed", paymentStatus: "paid", paymentMethod: "CASH" };
}
function parseLookup<T>(body: unknown, parseItem: (v: unknown) => T): Lookup<T> {
  const value = data(body);
  if (!Array.isArray(value.items) || value.items.length > 10 || !integer(value.page)
    || value.page < 1 || typeof value.hasMore !== "boolean") return invalid();
  return { items: value.items.map(parseItem), page: value.page, hasMore: value.hasMore };
}
export function parseSaleProducts(body: unknown): Lookup<SaleProduct> {
  return parseLookup(body, (v) => {
    if (!record(v) || !id(v.productId) || !text(v.sku) || !v.sku || !text(v.name)
      || !text(v.variantLabel) || !integer(v.price) || !integer(v.availableStock)
      || v.availableStock < 1) return invalid();
    return { productId: v.productId, sku: v.sku, name: v.name, variantLabel: v.variantLabel,
      price: v.price, availableStock: v.availableStock };
  });
}
export function parseSaleCustomers(body: unknown): Lookup<SaleCustomer> {
  return parseLookup(body, (v) => {
    if (!record(v) || !id(v.id) || !text(v.fullName) || !text(v.phone) || !text(v.email)) return invalid();
    return { id: v.id, fullName: v.fullName, phone: v.phone, email: v.email };
  });
}
async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, { ...options, credentials: "include", cache: "no-store",
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  } catch { throw new SaleApiError(0, "NETWORK_ERROR"); }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = record(body) && record(body.error) && text(body.error.code) ? body.error.code : "REQUEST_FAILED";
    throw new SaleApiError(response.status, code);
  }
  return body;
}
export async function findSaleProducts(query: string, page: number, signal?: AbortSignal) {
  return parseSaleProducts(await request(`staff/order-products?${new URLSearchParams({ query, page: String(page) })}`, { signal }));
}
export async function findSaleCustomers(query: string, page: number, signal?: AbortSignal) {
  return parseSaleCustomers(await request(`staff/order-customers?${new URLSearchParams({ query, page: String(page) })}`, { signal }));
}
export async function recoverSale(requestId: string) {
  return parseSaleReceipt(await request(`staff/orders/creation/${encodeURIComponent(requestId)}`));
}
export async function submitSale(input: SaleInput, requestId: string) {
  const csrf = data(await request("auth/csrf")).csrfToken;
  if (!text(csrf) || !/^[A-Za-z0-9_-]{43}$/.test(csrf)) return invalid();
  return parseSaleReceipt(await request("staff/orders", { method: "POST", headers: {
    "Content-Type": "application/json", "X-CSRF-Token": csrf, "Idempotency-Key": requestId,
  }, body: JSON.stringify(input) }));
}
export function validateSaleDraft(mode: "new" | "existing", contact: { name: string; phone: string; email: string },
  customer: SaleCustomer | null, lines: SaleLine[], cashReceived: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (mode === "existing" && !customer) errors.customer = "Hãy tìm và chọn một khách hàng.";
  if (mode === "new") {
    if (contact.name.trim().length < 2 || contact.name.trim().length > 100) errors.name = "Tên khách hàng cần từ 2 đến 100 ký tự.";
    if (!/^(?:0|\+84)[0-9]{9}$/.test(contact.phone.replace(/[\s.-]/g, ""))) errors.phone = "Nhập số điện thoại Việt Nam hợp lệ.";
    if (contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errors.email = "Email chưa đúng định dạng.";
  }
  if (!lines.length || lines.length > 50 || lines.some((l) => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > Math.min(999, l.availableStock))) {
    errors.items = "Chọn ít nhất một sản phẩm, số lượng nguyên và không vượt tồn khả dụng (tối đa 50 SKU).";
  }
  if (!Number.isSafeInteger(lines.reduce((sum, l) => sum + l.price * l.qty, 0))) errors.items = "Tổng tiền vượt giới hạn cho phép.";
  if (!cashReceived) errors.cashReceived = "Hãy xác nhận đã thu đủ tiền mặt trước khi tạo đơn.";
  return errors;
}
