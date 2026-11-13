import test from "node:test";
import assert from "node:assert/strict";
import { isOrderEligibleForOnlinePayment } from "../features/orders/types.ts";
import {
  convertOrderToCodApi,
  getOrderPaymentSessionApi,
  renewOrderPaymentSessionApi,
  ResumePaymentApiError,
} from "../features/orders/services/resume-payment.service.ts";

const orderId = "a".repeat(24);
const validCsrf = "c".repeat(43);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const csrfResponse = () =>
  json({ success: true, data: { csrfToken: validCsrf } });

test("isOrderEligibleForOnlinePayment allows only active non-offline unpaid ONLINE orders", () => {
  assert.equal(isOrderEligibleForOnlinePayment(null), false);
  assert.equal(isOrderEligibleForOnlinePayment(undefined), false);

  // Explicit backend flag takes precedence
  assert.equal(
    isOrderEligibleForOnlinePayment({ canResumeOnlinePayment: true }),
    true
  );
  assert.equal(
    isOrderEligibleForOnlinePayment({ canResumeOnlinePayment: false }),
    false
  );

  // Fallback computation from order fields
  assert.equal(
    isOrderEligibleForOnlinePayment({
      channel: "online",
      paymentMethod: "ONLINE",
      paymentStatusCode: "unpaid",
      orderStatus: "pending",
      status: "pending",
    }),
    true
  );
  assert.equal(
    isOrderEligibleForOnlinePayment({
      channel: "online",
      paymentMethod: "ONLINE",
      paymentStatusCode: "pending",
      orderStatus: "pending",
      status: "pending",
    }),
    true
  );
  assert.equal(
    isOrderEligibleForOnlinePayment({
      channel: "online",
      paymentMethod: "ONLINE",
      paymentStatusCode: "paid",
      orderStatus: "confirmed",
      status: "pending",
    }),
    false
  );
  assert.equal(
    isOrderEligibleForOnlinePayment({
      channel: "online",
      paymentMethod: "COD",
      paymentStatusCode: "unpaid",
      orderStatus: "pending",
      status: "pending",
    }),
    false
  );
  assert.equal(
    isOrderEligibleForOnlinePayment({
      channel: "online",
      paymentMethod: "ONLINE",
      paymentStatusCode: "unpaid",
      orderStatus: "cancelled",
      status: "cancelled",
    }),
    false
  );
  assert.equal(
    isOrderEligibleForOnlinePayment({
      channel: "offline",
      paymentMethod: "ONLINE",
      paymentStatusCode: "unpaid",
      orderStatus: "completed",
      status: "completed",
    }),
    false
  );
});

test("getOrderPaymentSessionApi sends cookies + no-store and returns validated session", async (t) => {
  const calls = [];
  const sampleSession = {
    orderId,
    orderCode: "ORD261112001",
    orderStatus: "pending",
    paymentMethod: "ONLINE",
    paymentStatus: "unpaid",
    total: 350000,
    paidAmount: 0,
    remainingAmount: 350000,
    needsReview: false,
    eligible: true,
    state: "eligible",
    message: null,
    paymentInfo: {
      orderCode: "ORD261112001",
      total: 350000,
      paidAmount: 0,
      remainingAmount: 350000,
      bankCode: "MB",
      accountNumber: "0123456789",
      accountHolder: "PETJOY STORE",
      memo: "PETJOY ORD261112001",
      qrUrl: "https://qr.sepay.vn/img?amount=350000",
      paymentExpiredAt: "2026-11-12T04:30:00.000Z",
      secondsLeft: 600,
      isExpired: false,
      isPaid: false,
    },
  };

  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return json({ success: true, data: { session: sampleSession } });
  });

  const session = await getOrderPaymentSessionApi(orderId);
  assert.deepEqual(session, sampleSession);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `/api/v1/orders/${orderId}/payment`);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.credentials, "include");
  assert.equal(calls[0].options.cache, "no-store");
});

test("getOrderPaymentSessionApi maps 401/404 and rejects malformed payloads", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    json({ success: false, error: { code: "ORDER_NOT_FOUND" } }, 404)
  );
  await assert.rejects(
    getOrderPaymentSessionApi(orderId),
    (err) =>
      err instanceof ResumePaymentApiError &&
      err.status === 404 &&
      err.code === "ORDER_NOT_FOUND"
  );
  t.mock.restoreAll();

  t.mock.method(globalThis, "fetch", async () =>
    json({ success: false }, 401)
  );
  await assert.rejects(
    getOrderPaymentSessionApi(orderId),
    (err) =>
      err instanceof ResumePaymentApiError &&
      err.status === 401 &&
      err.code === "UNAUTHENTICATED"
  );
  t.mock.restoreAll();

  t.mock.method(globalThis, "fetch", async () =>
    json({ success: true, data: { session: null } }, 200)
  );
  await assert.rejects(
    getOrderPaymentSessionApi(orderId),
    (err) =>
      err instanceof ResumePaymentApiError &&
      err.status === 502 &&
      err.code === "INVALID_RESPONSE"
  );
});

test("renewOrderPaymentSessionApi and convertOrderToCodApi obtain CSRF token and handle errors safely", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (String(url).endsWith("/csrf")) return csrfResponse();
    if (String(url).endsWith("/renew")) {
      return json({
        success: true,
        data: {
          orderId,
          orderCode: "ORD261112001",
          paymentExpiredAt: "2026-11-12T04:45:00.000Z",
          secondsLeft: 900,
        },
      });
    }
    return json({
      success: true,
      data: {
        orderId,
        orderCode: "ORD261112001",
        paymentMethod: "COD",
        paymentStatus: "unpaid",
      },
    });
  });

  const renewResult = await renewOrderPaymentSessionApi(orderId);
  assert.equal(renewResult.secondsLeft, 900);
  assert.equal(calls[1].url, `/api/v1/orders/${orderId}/payment/renew`);
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], validCsrf);
  assert.equal(calls[1].options.credentials, "include");
  assert.equal(calls[1].options.cache, "no-store");

  const codResult = await convertOrderToCodApi(orderId);
  assert.equal(codResult.paymentMethod, "COD");
  assert.equal(
    calls[3].url,
    `/api/v1/orders/${orderId}/payment/convert-to-cod`
  );
  assert.equal(calls[3].options.headers["X-CSRF-Token"], validCsrf);
  t.mock.restoreAll();

  // Reject invalid CSRF without triggering mutation
  let mutationCount = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).endsWith("/csrf")) {
      return json({ success: true, data: { csrfToken: "bad" } });
    }
    mutationCount += 1;
    return json({});
  });
  await assert.rejects(
    renewOrderPaymentSessionApi(orderId),
    (err) => err instanceof ResumePaymentApiError && err.code === "INVALID_RESPONSE"
  );
  assert.equal(mutationCount, 0);
  t.mock.restoreAll();

  // Mask raw server error message while keeping application error code
  t.mock.method(globalThis, "fetch", async (url) =>
    String(url).endsWith("/csrf")
      ? csrfResponse()
      : json(
          {
            success: false,
            message: "internal mongodb traceback",
            error: { code: "ORDER_CANCELLED" },
          },
          409
        )
  );
  await assert.rejects(
    convertOrderToCodApi(orderId),
    (err) =>
      err instanceof ResumePaymentApiError &&
      err.status === 409 &&
      err.code === "ORDER_CANCELLED" &&
      !err.message.includes("mongodb traceback")
  );
});

