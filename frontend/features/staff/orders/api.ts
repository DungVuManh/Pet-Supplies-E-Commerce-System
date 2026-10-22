import type {
  StaffOrderDetail,
  StaffOrdersFilterState,
  StaffOrdersListResponse,
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
