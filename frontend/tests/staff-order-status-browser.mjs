// Isolated UI regression check; no requests reach Firebase or the application's database.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const frontend = fileURLToPath(new URL("../", import.meta.url));
const origin = "http://127.0.0.1:3023", id = "a".repeat(24);
const user = { id: "b".repeat(24), role: "staff", fullName: "Staff kiểm thử", phone: "0912345678", email: "staff@example.test" };
const transitions = { pending: ["confirmed", "cancelled"], confirmed: ["processing", "cancelled"], processing: ["shipping"], shipping: ["completed"], completed: [], cancelled: [] };
let state = "pending", history = [], shipping = null, failure = "", submissions = [];
function detail() {
  return { id, orderCode: "ORDER-TEST", createdAt: "2026-10-22T09:00:00.000Z", channel: "online",
    orderStatus: state, paymentMethod: "COD", paymentStatus: "unpaid", subtotal: 200000, total: 200000, discount: 0, shippingFee: 0,
    customer: { name: "Khách kiểm thử", phone: "0912345678" }, shippingAddress: { street: "1 A", ward: "P1", district: "Q1", province: "TP.HCM" },
    shipping, statusHistory: history, allowedNextStatuses: transitions[state], createdByStaff: null,
    items: [{ name: "Thức ăn mèo", variantSku: "SKU-1", unitPrice: 100000, qty: 2, lineTotal: 200000, currentProduct: null }] };
}
async function api(path, method, body, headers) {
  const ok = (data) => ({ status: 200, body: { success: true, data } });
  const fail = (code, status) => ({ status, body: { success: false, error: { code } } });
  if (["/api/v1/auth/me", "/api/v1/staff/dashboard"].includes(path)) return ok({ user });
  if (path === "/api/v1/auth/csrf") return ok({ csrfToken: "x".repeat(43) });
  if (path === "/api/v1/staff/orders") return ok({
    items: [detail()], pagination: { page: 1, pageSize: 8, total: 1, totalPages: 1 },
    summary: { all: 1, statusCounts: { pending: 0, confirmed: 0, processing: 0, shipping: 1, completed: 0, cancelled: 0 } },
  });
  if (path === `/api/v1/staff/orders/${id}`) return ok({ order: detail() });
  if (path === `/api/v1/staff/orders/${id}/status` && method === "PATCH") {
    assert.equal(headers["x-csrf-token"], "x".repeat(43));
    submissions.push(body);
    if (failure === "conflict") { failure = ""; state = "processing"; return fail("ORDER_STATUS_CONFLICT", 409); }
    if (body.expectedStatus !== state || !transitions[state].includes(body.orderStatus)) return fail("INVALID_ORDER_TRANSITION", 409);
    const from = state; state = body.orderStatus; shipping = body.shipping || shipping;
    history.push({ from, to: state, at: "2026-10-22T10:00:00.000Z", actorName: user.fullName });
    await new Promise((yes) => setTimeout(yes, 150));
    if (failure === "lost") { failure = ""; return fail("ORDERS_UNAVAILABLE", 503); }
    return ok({ order: { id, orderStatus: state } });
  }
  return fail("NOT_FOUND", 404);
}
const fixture = createServer(async (request, response) => {
  const result = await api(new URL(request.url, origin).pathname, request.method, null, request.headers);
  response.writeHead(result.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(result.body));
});
await new Promise((yes, no) => fixture.once("error", no).listen(3133, "127.0.0.1", yes));
const next = spawn(process.execPath, [resolve(frontend, "node_modules/next/dist/bin/next"), "start", "-p", "3023", "-H", "127.0.0.1"], {
  cwd: frontend, windowsHide: true, env: { ...process.env, BACKEND_ORIGIN: "http://127.0.0.1:3133" }, stdio: ["ignore", "pipe", "pipe"],
});
let logs = "", browser;
next.stdout.on("data", (b) => { logs += b; }); next.stderr.on("data", (b) => { logs += b; });
try {
  for (let i = 0; i < 100; i++) {
    if (next.exitCode !== null) throw new Error(logs);
    if (await fetch(origin).then((r) => r.ok, () => false)) break;
    await new Promise((yes) => setTimeout(yes, 200));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: "__Host-petly-session", value: "fixture-session-not-a-real-token", url: "https://127.0.0.1:3023", secure: true, httpOnly: true, sameSite: "Lax" }]);
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const result = await api(new URL(req.url()).pathname, req.method(), req.postDataJSON(), req.headers());
    await route.fulfill({ status: result.status, contentType: "application/json", body: JSON.stringify(result.body) });
  });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${origin}/staff/orders/${id}`);
  const panel = page.getByRole("region", { name: "Cập nhật trạng thái" });
  const select = panel.getByRole("combobox");
  const values = () => select.locator("option").evaluateAll((nodes) => nodes.map((node) => node.value));
  const begin = () => panel.getByRole("button", { name: "Cập nhật trạng thái", exact: true }).click();
  const confirm = () => panel.getByRole("button", { name: "Xác nhận cập nhật", exact: true }).click();
  await select.waitFor(); assert.deepEqual(await values(), ["confirmed", "cancelled"]);
  await begin(); assert.equal(submissions.length, 0);
  await panel.getByRole("button", { name: "Quay lại" }).click(); assert.equal(submissions.length, 0);
  await begin();
  await panel.getByRole("button", { name: "Xác nhận cập nhật", exact: true }).dblclick();
  await select.locator('option[value="processing"]').waitFor({ state: "attached" });
  assert.equal(submissions.length, 1); assert.equal(history.length, 1);
  await page.getByText("Cập nhật trạng thái đơn hàng thành công.").waitFor();
  failure = "conflict";
  await begin(); await confirm();
  await panel.getByRole("alert").waitFor();
  assert.equal(await panel.getByText("Cập nhật trạng thái đơn hàng thành công.").count(), 0);
  await panel.getByRole("button", { name: "Tải lại đơn hàng" }).click();
  await select.locator('option[value="shipping"]').waitFor({ state: "attached" });
  await panel.getByLabel("Đơn vị vận chuyển (tùy chọn)").fill("Shipper tự do");
  await begin(); await confirm();
  await select.locator('option[value="completed"]').waitFor({ state: "attached" });
  assert.deepEqual(submissions.at(-1).shipping, { carrier: "Shipper tự do", trackingNumber: "" });
  assert.deepEqual(await values(), ["completed"]);
  await begin(); await confirm();
  await panel.getByText("Đơn hàng không có bước cập nhật tiếp theo dành cho staff.").waitFor();
  assert.equal(state, "completed");
  assert.deepEqual(submissions.at(-1), { expectedStatus: "shipping", orderStatus: "completed" });
  await page.reload();
  await panel.getByText("Đơn hàng không có bước cập nhật tiếp theo dành cho staff.").waitFor();
  assert.equal(await panel.getByRole("combobox").count(), 0);
  state = "confirmed"; history = []; await page.reload(); await select.waitFor();
  await select.selectOption("cancelled"); await begin(); await confirm();
  await panel.getByText("Đơn hàng không có bước cập nhật tiếp theo dành cho staff.").waitFor();
  state = "processing"; history = []; failure = "lost"; await page.reload(); await select.waitFor();
  await begin(); await confirm(); await panel.getByRole("alert").waitFor();
  assert.equal(await panel.getByRole("button", { name: "Cập nhật trạng thái", exact: true }).count(), 0);
  await panel.getByRole("button", { name: "Tải lại đơn hàng" }).click();
  await select.locator('option[value="completed"]').waitFor({ state: "attached" });
  assert.equal(history.length, 1); assert.deepEqual(errors, []);
  console.log("PASS confirmation/back, double-submit guard, persisted refresh, conflict reload, optional shipping, terminal states and lost-response recovery");
  await page.goto(`${origin}/staff/orders`);
  const filter = page.getByRole("combobox").filter({ has: page.locator('option[value="pending"]') });
  await filter.waitFor();
  assert.deepEqual(await filter.locator("option").allTextContents(), [
    "Tất cả trạng thái", "Chờ xử lý", "Đã xác nhận", "Đang chuẩn bị", "Đang giao", "Hoàn thành", "Đã hủy",
  ]);
  const tabs = page.getByLabel("Lọc nhanh theo trạng thái");
  assert.equal(await tabs.getByRole("button").count(), 7);
  assert.equal(await page.getByText("Đã giao", { exact: true }).count(), 0);
  await filter.selectOption("cancelled");
  await page.waitForURL("**/staff/orders?status=cancelled");
  assert.equal(await filter.inputValue(), "cancelled");
  await tabs.getByRole("button", { name: "Hoàn thành", exact: false }).click();
  await page.waitForURL("**/staff/orders?status=completed");
  assert.equal(await filter.inputValue(), "completed");
  assert.deepEqual(errors, []);
  console.log("PASS six status filters and cancellation/completion navigation");
  await page.goto(`${origin}/staff/orders/${id}`); await select.waitFor();
  assert.equal(await panel.evaluate((el) => getComputedStyle(el).paddingTop), "24px",
    "Visual checks require compiled Tailwind CSS; Webpack does not run this project's Turbopack-only CSS loader.");
  const screenshots = resolve(frontend, ".next/staff-order-status-browser"); await mkdir(screenshots, { recursive: true });
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1024 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `body overflow ${width}`);
    await page.screenshot({ path: resolve(screenshots, `status-${width}.png`), fullPage: true });
  }
  await page.goto(`${origin}/staff/orders?status=completed`); await filter.waitFor();
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1024 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `list body overflow ${width}`);
    await page.screenshot({ path: resolve(screenshots, `orders-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log("PASS responsive layouts");
} finally {
  await browser?.close(); next.kill(); fixture.closeAllConnections();
  await new Promise((yes) => fixture.close(yes));
}
