import test from "node:test";
import assert from "node:assert/strict";
import { isReturnImageRequired } from "../features/orders/types.ts";
import {
  uploadReturnImagesApi,
  submitOrderReturnApi,
  OrderReturnApiError,
} from "../features/orders/services/order-return.service.ts";
import {
  fetchStaffReturns,
  fetchStaffReturnDetail,
  submitStaffReturnDecision,
  StaffReturnApiError,
} from "../features/staff/returns/api.ts";

const orderId = "a".repeat(24);
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const csrf = () => json({ success: true, data: { csrfToken: "x".repeat(43) } });

test("isReturnImageRequired enforces Q1: A return image requirements", () => {
  assert.equal(isReturnImageRequired("damaged_or_missing"), true);
  assert.equal(isReturnImageRequired("damaged_or_defective"), true);
  assert.equal(isReturnImageRequired("missing_items"), true);
  assert.equal(isReturnImageRequired("not_received"), false);
});

test("uploadReturnImagesApi rejects empty files array without calling fetch", async () => {
  await assert.rejects(
    uploadReturnImagesApi(orderId, []),
    (err) => err instanceof OrderReturnApiError && err.code === "NO_FILES"
  );
});

test("uploadReturnImagesApi rejects more than 5 files", async () => {
  const fakeFiles = Array(6).fill(new File(["data"], "test.png", { type: "image/png" }));
  await assert.rejects(
    uploadReturnImagesApi(orderId, fakeFiles),
    (err) => err instanceof OrderReturnApiError && err.code === "TOO_MANY_FILES"
  );
});

test("uploadReturnImagesApi uploads files with CSRF token and multipart payload", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/csrf")) return csrf();
    return json({
      success: true,
      data: {
        urls: ["https://res.cloudinary.com/petjoy/image/upload/v1/petjoy/returns/img1.jpg"],
      },
    });
  });

  const testFile = new File(["dummy content"], "photo.jpg", { type: "image/jpeg" });
  const result = await uploadReturnImagesApi(orderId, [testFile]);

  assert.deepEqual(result, {
    urls: ["https://res.cloudinary.com/petjoy/image/upload/v1/petjoy/returns/img1.jpg"],
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `/api/v1/orders/${orderId}/return/upload`);
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "x".repeat(43));
  assert.equal(calls[1].options.credentials, "include");
  assert.equal(calls[1].options.cache, "no-store");
  assert.ok(calls[1].options.body instanceof FormData);
});

test("submitOrderReturnApi sends JSON payload with CSRF and returns returnRequest", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/csrf")) return csrf();
    return json(
      {
        success: true,
        data: {
          returnRequest: {
            reason: "damaged_or_defective",
            description: "Hàng bị vỡ khi giao",
            images: ["https://res.cloudinary.com/petjoy/image/upload/v1/photo.jpg"],
            status: "pending",
          },
        },
      },
      201
    );
  });

  const payload = {
    reason: "damaged_or_missing",
    bankAccount: {
      bankName: "Vietcombank",
      accountNumber: "1234567890",
      accountHolder: "NGUYEN VAN A",
    },
    description: "Hàng bị vỡ khi giao",
    images: ["https://res.cloudinary.com/petjoy/image/upload/v1/photo.jpg"],
  };
  const result = await submitOrderReturnApi(orderId, payload);

  assert.equal(result.returnRequest.status, "pending");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `/api/v1/orders/${orderId}/return`);
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "x".repeat(43));
  assert.equal(calls[1].options.credentials, "include");
  assert.equal(calls[1].options.cache, "no-store");
  assert.equal(JSON.parse(calls[1].options.body).reason, "damaged_or_missing");
  assert.equal(JSON.parse(calls[1].options.body).bankAccount.bankName, "Vietcombank");
});

test("submitStaffReturnDecision sends approve decision with CSRF", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/csrf")) return csrf();
    return json({
      success: true,
      data: {
        orderId,
        decision: "approve",
        status: "approved",
      },
    });
  });

  const result = await submitStaffReturnDecision(orderId, { decision: "approve" });

  assert.equal(result.status, "approved");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `/api/v1/staff/returns/${orderId}/decision`);
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "x".repeat(43));
  assert.equal(JSON.parse(calls[1].options.body).decision, "approve");
});

test("submitStaffReturnDecision sends reject decision with rejectionReason", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/csrf")) return csrf();
    return json({
      success: true,
      data: {
        orderId,
        decision: "reject",
        status: "rejected",
      },
    });
  });

  const result = await submitStaffReturnDecision(orderId, {
    decision: "reject",
    rejectionReason: "Ảnh minh chứng không đúng quy định",
  });

  assert.equal(result.status, "rejected");
  assert.equal(JSON.parse(calls[1].options.body).rejectionReason, "Ảnh minh chứng không đúng quy định");
});

test("staff returns client rejects malformed responses", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.endsWith("/csrf")) return csrf();
    return json({ success: false, error: { code: "RETURN_NOT_FOUND" } }, 404);
  });

  await assert.rejects(
    fetchStaffReturnDetail(orderId),
    (err) => err instanceof StaffReturnApiError && err.code === "RETURN_NOT_FOUND"
  );
});

test("fetchStaffReturns formats query parameters correctly", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return json({
      success: true,
      data: {
        items: [],
        pagination: { page: 2, pageSize: 10, totalItems: 0, totalPages: 0 },
        counts: { all: 0, pending: 0, approved: 0, rejected: 0 },
      },
    });
  });

  await fetchStaffReturns({ status: "pending", query: "090123", page: 2 });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes("status=pending"));
  assert.ok(calls[0].includes("query=090123"));
  assert.ok(calls[0].includes("page=2"));
});

