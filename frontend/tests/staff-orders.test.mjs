import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOrdersQueryString,
  StaffOrdersApiError,
} from "../features/staff/orders/api.ts";
import {
  orderStatusLabels,
  orderStatusTones,
  paymentStatusLabels,
  paymentStatusTones,
  sortOptions,
} from "../features/staff/orders/types.ts";

test("buildOrdersQueryString ignores defaults and serializes active filters", () => {
  const defaultQuery = buildOrdersQueryString({
    query: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
    sort: "createdAt_desc",
    page: 1,
  });
  assert.equal(defaultQuery, "");

  const activeQuery = buildOrdersQueryString({
    query: "PA261012018",
    status: "pending",
    dateFrom: "2026-10-01",
    dateTo: "2026-10-12",
    sort: "total_desc",
    page: 2,
  });
  const params = new URLSearchParams(activeQuery);
  assert.equal(params.get("query"), "PA261012018");
  assert.equal(params.get("status"), "pending");
  assert.equal(params.get("dateFrom"), "2026-10-01");
  assert.equal(params.get("dateTo"), "2026-10-12");
  assert.equal(params.get("sort"), "total_desc");
  assert.equal(params.get("page"), "2");
});

test("StaffOrdersApiError retains HTTP status and application error code", () => {
  const error = new StaffOrdersApiError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  assert.equal(error.status, 404);
  assert.equal(error.code, "ORDER_NOT_FOUND");
  assert.equal(error.message, "Không tìm thấy đơn hàng.");
});

test("Order statuses and payment mappings cover the 6 staff statuses and 4 payment statuses", () => {
  const expectedOrderStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipping",
    "completed",
    "cancelled",
  ];
  assert.deepEqual(Object.keys(orderStatusLabels), expectedOrderStatuses);
  assert.deepEqual(Object.keys(orderStatusTones), expectedOrderStatuses);
  for (const status of expectedOrderStatuses) {
    assert.ok(orderStatusLabels[status], `Missing label for status: ${status}`);
    assert.ok(orderStatusTones[status], `Missing tone for status: ${status}`);
  }

  const expectedPaymentStatuses = ["unpaid", "pending", "paid", "failed"];
  for (const status of expectedPaymentStatuses) {
    assert.ok(paymentStatusLabels[status], `Missing label for payment status: ${status}`);
    assert.ok(paymentStatusTones[status], `Missing tone for payment status: ${status}`);
  }

  assert.equal(sortOptions.length, 4);
});
