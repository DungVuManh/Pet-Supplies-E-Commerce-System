export type ProductStatus = "active" | "hidden";
export type ProductSnapshot = { physical: number; reserved: number; status: ProductStatus; description: string };
export type StaffProductDetail = ProductSnapshot & {
  productId: string; sku: string; name: string; category: string; brand: string; weight: string;
  price: number; availableStock: number; threshold: number; location: string; image: string; updated: string;
};
export type ProductUpdate = { physical: number; status: ProductStatus; description: string; expected: ProductSnapshot };

const messages: Record<string, string> = {
  PRODUCT_CHANGED: "Sản phẩm hoặc tồn kho đã thay đổi. Hãy tải lại trước khi lưu.",
  STOCK_BELOW_RESERVED: "Số lượng thực tế không được nhỏ hơn số đang giữ chỗ.",
  VALIDATION_ERROR: "Thông tin sản phẩm chưa hợp lệ. Hãy kiểm tra lại.",
  NOT_FOUND: "Không tìm thấy sản phẩm.",
  CSRF_INVALID: "Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.",
};
export class StaffProductsApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(messages[code] || "Chưa xác nhận được kết quả. Hãy tải lại sản phẩm để kiểm tra.");
    this.status = status;
    this.code = code;
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function integer(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function invalid(): never { throw new StaffProductsApiError(502, "INVALID_RESPONSE"); }

export function parseStaffProduct(data: unknown, sku: string): StaffProductDetail {
  if (!record(data) || typeof data.productId !== "string" || !/^[a-f\d]{24}$/i.test(data.productId)
    || data.sku !== sku || typeof data.name !== "string" || !data.name
    || typeof data.category !== "string" || typeof data.brand !== "string" || typeof data.weight !== "string"
    || typeof data.description !== "string" || typeof data.image !== "string" || typeof data.updated !== "string"
    || typeof data.location !== "string" || !integer(data.price) || !integer(data.physical) || !integer(data.reserved)
    || !integer(data.availableStock) || !integer(data.threshold) || data.reserved > data.physical
    || data.availableStock !== data.physical - data.reserved || (data.status !== "active" && data.status !== "hidden")) return invalid();
  return { productId: data.productId, sku, name: data.name, category: data.category, brand: data.brand,
    weight: data.weight, description: data.description, image: data.image, updated: data.updated,
    location: data.location, price: data.price, physical: data.physical, reserved: data.reserved,
    availableStock: data.availableStock, threshold: data.threshold, status: data.status };
}

async function request(path: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(path, { ...options, credentials: "include", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
  } catch { throw new StaffProductsApiError(0, "NETWORK_ERROR"); }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = record(body) && record(body.error) && typeof body.error.code === "string" ? body.error.code : "REQUEST_FAILED";
    throw new StaffProductsApiError(response.status, code);
  }
  if (!record(body) || body.success !== true || !record(body.data)) return invalid();
  return body.data;
}

export async function fetchStaffProduct(origin: string, cookieHeader: string, sku: string) {
  return parseStaffProduct(await request(`${origin}/api/v1/staff/products/${encodeURIComponent(sku)}`, {
    headers: { Accept: "application/json", Cookie: cookieHeader },
  }), sku);
}

export async function updateStaffProduct(sku: string, input: ProductUpdate) {
  const { csrfToken } = await request("/api/v1/auth/csrf");
  if (typeof csrfToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(csrfToken)) return invalid();
  const result = await request(`/api/v1/staff/products/${encodeURIComponent(sku)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(input),
  });
  if (result.sku !== sku) return invalid();
}

export function validateProductDraft(physical: string, description: string, reserved: number) {
  const errors: { physical?: string; description?: string } = {};
  if (!/^\d+$/.test(physical) || !integer(Number(physical))) errors.physical = "Nhập số lượng nguyên không âm hợp lệ.";
  else if (Number(physical) < reserved) errors.physical = `Số lượng thực tế không được nhỏ hơn ${reserved} sản phẩm đang giữ chỗ.`;
  if (!description.trim() || description.trim().length > 10000) errors.description = "Nhập mô tả từ 1 đến 10.000 ký tự.";
  return errors;
}
