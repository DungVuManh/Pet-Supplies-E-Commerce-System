import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchStaffOrderInvoice,
  recordStaffOrderInvoiceExport,
  StaffOrdersApiError,
} from "../features/staff/orders/api.ts";
import {
  INVOICE_ELIGIBLE_STATUSES,
  isInvoiceEligibleOrder,
} from "../features/staff/orders/types.ts";

const orderId = "a".repeat(24);
const validCsrf = "x".repeat(43);
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const csrfResponse = () =>
  json({ success: true, data: { csrfToken: validCsrf } });

const sampleInvoice = {
  store: {
    name: "Petjoy",
    hotline: "0900000001",
    email: "hello@petjoy.vn",
    address: "123 Nguyen Hue, Q1",
  },
  order: {
    id: orderId,
    orderCode: "ORD261111001",
    channel: "offline",
    createdAt: "2026-11-11T08:00:00.000Z",
    orderStatus: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "cash",
    customerName: "Nguyen Van A",
    customerPhone: "0901234567",
    customerEmail: "a@example.com",
    shippingAddress: null,
    note: "",
    items: [
      {
        productId: "b".repeat(24),
        productName: "Hat cho meo",
        variantName: "Tui 1kg",
        sku: "CAT-1KG",
        unitPrice: 120000,
        quantity: 2,
        lineTotal: 240000,
      },
    ],
    subtotal: 240000,
    discountAmount: 20000,
    voucherCode: "GIAM20",
    shippingFee: 0,
    totalAmount: 220000,
    paidAmount: 220000,
    remainingAmount: 0,
    needsReview: false,
    handledByStaffName: "Staff 1",
    handledByStaffEmail: "staff@petjoy.vn",
    confirmedAt: "2026-11-11T08:00:00.000Z",
    completedAt: null,
  },
  invoiceMeta: {
    invoiceNumber: "HD-ORD261111001",
    issuedAt: "2026-11-11T08:05:00.000Z",
    currency: "VND",
    documentTitle: "HÓA ĐƠN BÁN HÀNG",
  },
};

test("isInvoiceEligibleOrder accepts only confirmed/processing/shipping/completed statuses", () => {
  assert.deepEqual([...INVOICE_ELIGIBLE_STATUSES], [
    "confirmed",
    "processing",
    "shipping",
    "completed",
  ]);
  assert.equal(isInvoiceEligibleOrder("pending"), false);
  assert.equal(isInvoiceEligibleOrder("cancelled"), false);
  assert.equal(isInvoiceEligibleOrder("confirmed"), true);
  assert.equal(isInvoiceEligibleOrder("processing"), true);
  assert.equal(isInvoiceEligibleOrder("shipping"), true);
  assert.equal(isInvoiceEligibleOrder("completed"), true);
  assert.equal(isInvoiceEligibleOrder(null), false);
  assert.equal(isInvoiceEligibleOrder(undefined), false);
  assert.equal(isInvoiceEligibleOrder(""), false);
  assert.equal(isInvoiceEligibleOrder("draft"), false);
});

test("fetchStaffOrderInvoice sends Cookie and no-store and returns validated invoice payload", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return json({ success: true, data: { invoice: sampleInvoice } });
  });

  const result = await fetchStaffOrderInvoice(
    "http://127.0.0.1:4000",
    "session=abc123",
    orderId
  );

  assert.deepEqual(result, sampleInvoice);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    `http://127.0.0.1:4000/api/v1/staff/orders/${orderId}/invoice`
  );
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.headers.Accept, "application/json");
  assert.equal(calls[0].options.headers.Cookie, "session=abc123");
});

test("fetchStaffOrderInvoice preserves 409 INVOICE_NOT_ELIGIBLE and rejects malformed payloads", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    json(
      {
        success: false,
        message: "Đơn hàng chưa đủ điều kiện xuất hóa đơn.",
        error: { code: "INVOICE_NOT_ELIGIBLE" },
      },
      409
    )
  );

  await assert.rejects(
    fetchStaffOrderInvoice("http://127.0.0.1:4000", "session=abc123", orderId),
    (err) =>
      err instanceof StaffOrdersApiError &&
      err.status === 409 &&
      err.code === "INVOICE_NOT_ELIGIBLE" &&
      err.message === "Đơn hàng chưa đủ điều kiện xuất hóa đơn."
  );

  t.mock.restoreAll();

  for (const invalidBody of [
    null,
    { success: true, data: { invoice: null } },
    { success: true, data: { invoice: { store: {} } } },
  ]) {
    t.mock.method(globalThis, "fetch", async () => json(invalidBody, 200));
    await assert.rejects(
      fetchStaffOrderInvoice("http://127.0.0.1:4000", "session=abc123", orderId),
      (err) =>
        err instanceof StaffOrdersApiError &&
        err.status === 502 &&
        err.code === "INVALID_RESPONSE"
    );
    t.mock.restoreAll();
  }
});

test("recordStaffOrderInvoiceExport fetches CSRF token and posts export record with cookies and no-store", async (t) => {
  const calls = [];
  const expectedRecord = {
    orderId,
    orderCode: "ORD261111001",
    exportedAt: "2026-11-11T08:10:00.000Z",
    exportedBy: "staff-uid-1",
  };

  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (String(url).endsWith("/csrf")) return csrfResponse();
    return json({ success: true, data: { exportRecord: expectedRecord } }, 201);
  });

  const record = await recordStaffOrderInvoiceExport(orderId);
  assert.deepEqual(record, expectedRecord);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "/api/v1/auth/csrf");
  assert.equal(calls[1].url, `/api/v1/staff/orders/${orderId}/invoice/exports`);
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], validCsrf);
  assert.equal(calls[1].options.headers["Content-Type"], "application/json");
  assert.equal(calls[1].options.credentials, "include");
  assert.equal(calls[1].options.cache, "no-store");
  assert.deepEqual(JSON.parse(calls[1].options.body), {});
});

test("recordStaffOrderInvoiceExport aborts on invalid CSRF and maps error codes cleanly", async (t) => {
  let postCalls = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).endsWith("/csrf")) {
      return json({ success: true, data: { csrfToken: "short" } });
    }
    postCalls += 1;
    return json({});
  });

  await assert.rejects(
    recordStaffOrderInvoiceExport(orderId),
    (err) =>
      err instanceof StaffOrdersApiError &&
      err.status === 502 &&
      err.code === "INVALID_RESPONSE"
  );
  assert.equal(postCalls, 0);
  t.mock.restoreAll();

  for (const [status, code] of [
    [409, "INVOICE_NOT_ELIGIBLE"],
    [404, "ORDER_NOT_FOUND"],
    [403, "CSRF_INVALID"],
  ]) {
    t.mock.method(globalThis, "fetch", async (url) =>
      String(url).endsWith("/csrf")
        ? csrfResponse()
        : json(
            {
              success: false,
              message: "sensitive backend stacktrace",
              error: { code },
            },
            status
          )
    );

    await assert.rejects(
      recordStaffOrderInvoiceExport(orderId),
      (err) =>
        err instanceof StaffOrdersApiError &&
        err.status === status &&
        err.code === code &&
        !err.message.includes("sensitive backend stacktrace")
    );
    t.mock.restoreAll();
  }

  t.mock.method(globalThis, "fetch", async (url) =>
    String(url).endsWith("/csrf")
      ? csrfResponse()
      : json({ success: true, data: { exportRecord: { orderId } } })
  );
  await assert.rejects(
    recordStaffOrderInvoiceExport(orderId),
    (err) =>
      err instanceof StaffOrdersApiError &&
      err.status === 502 &&
      err.code === "INVALID_RESPONSE"
  );
  t.mock.restoreAll();

  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).endsWith("/csrf")) return csrfResponse();
    throw new Error("socket closed");
  });
  await assert.rejects(
    recordStaffOrderInvoiceExport(orderId),
    (err) =>
      err instanceof StaffOrdersApiError &&
      err.status === 0 &&
      err.code === "NETWORK_ERROR"
  );
});

