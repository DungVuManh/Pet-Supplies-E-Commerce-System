export type CustomerVoucherState = "ready" | "used" | "expired";

export type CustomerVoucherTab = "all" | "ready" | "used" | "expired";

export interface CustomerVoucherItem {
  _id: string;
  voucherId: string;
  code: string;
  name: string;
  type: "percent" | "fixed";
  value: number;
  maxDiscount?: number | null;
  minOrderAmount: number;
  startAt: string;
  endAt: string;
  endDate: string;
  savedAt: string;
  state: CustomerVoucherState;
  isApplicable?: boolean;
}

export interface CustomerVoucherCounts {
  all: number;
  ready: number;
  used: number;
  expired: number;
}

export interface CustomerVoucherPagination {
  page: number;
  limit: number;
  total: number;
}

export interface CustomerVoucherListResponse {
  items: CustomerVoucherItem[];
  counts: CustomerVoucherCounts;
  pagination: CustomerVoucherPagination;
}

export interface SaveVoucherPayload {
  code: string;
}

export interface SyncVouchersPayload {
  codes: string[];
}

