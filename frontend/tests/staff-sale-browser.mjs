// Isolated production-UI test. Backend responses below are fixtures, never Firebase or MongoDB.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const frontend = fileURLToPath(new URL("../", import.meta.url));
const screenshots = resolve(frontend, ".next/staff-sale-browser");
const origin = "http://127.0.0.1:3020";
const user = { id: "b".repeat(24), fullName: "Nhân viên kiểm thử", email: "staff@example.test", phone: "0912345678", role: "staff" };
const products = [{ productId: "a".repeat(24), sku: "SKU-1", name: "Thức ăn mèo tại quầy", variantLabel: "Túi 1 kg", price: 100000, availableStock: 10 }];
const receipts = new Map();
const submissions = [];
let failure = "saved";
function reply(response, data, status = 200) {
 response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
 response.end(JSON.stringify(data));
}
const ok = (data) => ({ success: true, data });
const fail = (code) => ({ success: false, error: { code } });
const fixture = createServer(async (request, response) => {
 const url = new URL(request.url, origin);
 if (["/api/v1/staff/dashboard", "/api/v1/auth/me"].includes(url.pathname)) return reply(response, ok({ user }));
 if (url.pathname === "/api/v1/auth/csrf") {
  response.setHeader("Set-Cookie", `petly-csrf=${"x".repeat(43)}; Path=/; HttpOnly; SameSite=Lax`);
  return reply(response, ok({ csrfToken: "x".repeat(43) }));
 }
 if (url.pathname === "/api/v1/staff/order-products") {
  const query = url.searchParams.get("query");
  return query === "error" ? reply(response, fail("PRODUCTS_UNAVAILABLE"), 503)
   : reply(response, ok({ items: query === "none" ? [] : products, page: 1, hasMore: false }));
 }
 if (url.pathname === "/api/v1/staff/order-customers") return reply(response, ok({
  items: [{ id: "c".repeat(24), fullName: "Customer kiểm thử", phone: "0901234567", email: "customer@example.test" }], page: 1, hasMore: false,
 }));
 if (url.pathname.startsWith("/api/v1/staff/orders/creation/")) {
  const order = receipts.get(url.pathname.split("/").at(-1));
  return reply(response, order ? ok({ order }) : fail("CREATION_NOT_FOUND"), order ? 200 : 404);
 }
 if (url.pathname === "/api/v1/staff/orders" && request.method === "POST") {
  let raw = ""; for await (const chunk of request) raw += chunk;
  const payload = JSON.parse(raw);
  const key = request.headers["idempotency-key"];
  assert.equal(request.headers["x-csrf-token"], "x".repeat(43));
  submissions.push({ key, payload });
  const order = receipts.get(key) || { id: String(receipts.size + 1).padStart(24, "0"), orderCode: `POS-FIXTURE-${receipts.size + 1}`,
   total: 200000, channel: "offline", paymentMethod: "CASH", paymentStatus: "paid", orderStatus: "completed" };
  if (failure === "unsaved") { failure = "success"; return reply(response, fail("ORDERS_UNAVAILABLE"), 503); }
  receipts.set(key, order);
  if (failure === "saved") { failure = "success"; return reply(response, fail("ORDERS_UNAVAILABLE"), 503); }
  return reply(response, ok({ order }), 201);
 }
 if (/^\/api\/v1\/staff\/orders\/[a-f\d]{24}$/.test(url.pathname)) {
  const order = [...receipts.values()].find((v) => v.id === url.pathname.split("/").at(-1));
  return reply(response, ok({ order: { ...order, createdAt: new Date().toISOString(), customer: { name: "Khách kiểm thử", phone: "0912345678" },
   subtotal: 200000, discount: 0, shippingFee: 0, promotionCode: null, shippingAddress: {}, shipping: null, createdByStaff: user.fullName,
   items: [{ productId: "a".repeat(24), variantSku: "SKU-1", name: products[0].name, unitPrice: 100000, qty: 2, lineTotal: 200000, currentProduct: null }],
   statusHistory: [{ from: null, to: "completed", at: new Date().toISOString(), actorName: user.fullName }],
  } }));
 }
 reply(response, fail("NOT_FOUND"), 404);
});
await new Promise((yes, no) => fixture.once("error", no).listen(3001, "127.0.0.1", yes));
const next = spawn(process.execPath, [resolve(frontend, "node_modules/next/dist/bin/next"), "start", "-p", "3020", "-H", "127.0.0.1"], {
 cwd: frontend, windowsHide: true, env: { ...process.env, BACKEND_ORIGIN: "http://127.0.0.1:3001" }, stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
next.stdout.on("data", (b) => { serverOutput += b; });
next.stderr.on("data", (b) => { serverOutput += b; });
let browser, page;
try {
 for (let i = 0; i < 100; i++) {
  if (next.exitCode !== null) throw new Error(serverOutput);
  if (await fetch(origin).then((r) => r.ok, () => false)) break;
  await new Promise((yes) => setTimeout(yes, 200));
 }
 browser = await chromium.launch({ channel: "chrome", headless: true });
 // The fake production cookie is installed only in this isolated fixture context.
 const context = await browser.newContext();
 await context.addCookies([{ name: "__Host-petly-session", value: "fixture-session-not-a-real-token", url: "https://127.0.0.1:3020", secure: true, httpOnly: true, sameSite: "Lax" }]);
 page = await context.newPage();
 const errors = [];
 page.on("pageerror", (error) => errors.push(error.message));
 await page.goto(`${origin}/staff/orders/new`);
 await page.getByRole("button", { name: "Xác nhận tạo đơn" }).waitFor();
 await page.getByRole("button", { name: "Xác nhận tạo đơn" }).click();
 await page.getByText("Tên khách hàng cần từ 2 đến 100 ký tự.").waitFor();
 assert.equal(await page.locator("#sale-name").evaluate((el) => el === document.activeElement), true);
 await page.getByLabel("Tên khách hàng", { exact: false }).fill("Khách kiểm thử");
 await page.getByLabel("Số điện thoại", { exact: false }).fill("0912345678");
 await page.getByRole("button", { name: "Thêm", exact: true }).click();
 await page.getByRole("spinbutton", { name: "Số lượng SKU-1" }).fill("2");
 await page.getByRole("checkbox", { name: /Đã thu đủ/ }).check();
 await mkdir(screenshots, { recursive: true });
 for (const width of [320, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 1024 });
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `body overflow ${width}`);
  await page.screenshot({ path: resolve(screenshots, `create-${width}.png`), fullPage: true });
 }
 const search = page.getByPlaceholder("Tên sản phẩm hoặc mã SKU");
 await search.fill("none"); await page.getByText("Không có kết quả phù hợp.").waitFor();
 await search.fill("error"); await page.getByText("Chưa thể tải kết quả. Vui lòng thử lại.", { exact: false }).waitFor();
 await search.fill(""); await page.getByRole("button", { name: "Thêm", exact: true }).waitFor();
 await page.getByRole("button", { name: "Xác nhận tạo đơn" }).focus();
 await page.keyboard.press("Enter");
 await page.getByRole("button", { name: "Gửi lại cùng yêu cầu" }).waitFor();
 assert.equal(await page.getByLabel("Tên khách hàng", { exact: false }).isDisabled(), true);
 await page.reload();
 await page.waitForURL(/\/staff\/orders\/[a-f\d]{24}$/);
 await page.getByText("Tiền mặt tại quầy").waitFor();
 await page.getByText("Nhận tại cửa hàng · Không giao hàng").filter({ visible: true }).waitFor();
 console.log("PASS guest sale, field focus, responsive layouts, empty/error states, uncertain commit reload recovery");

 failure = "unsaved";
 await page.goto(`${origin}/staff/orders/new`);
 await page.getByRole("radio", { name: "Customer có tài khoản" }).check();
 await page.getByLabel("Tìm Customer có tài khoản").fill("Customer");
 await page.getByRole("button", { name: "Chọn khách", exact: true }).click();
 await page.getByRole("button", { name: "Thêm", exact: true }).click();
 await page.getByRole("spinbutton", { name: "Số lượng SKU-1" }).fill("2");
 await page.getByRole("checkbox", { name: /Đã thu đủ/ }).check();
 await page.getByRole("button", { name: "Xác nhận tạo đơn" }).click();
 await page.getByRole("button", { name: "Gửi lại cùng yêu cầu" }).click();
 await page.waitForURL(/\/staff\/orders\/[a-f\d]{24}$/);
 assert.equal(submissions.at(-1).payload.customerId, "c".repeat(24));
 assert.deepEqual(submissions.at(-1), submissions.at(-2));
 assert.equal(receipts.size, 2);
 assert.deepEqual(errors, []);
 console.log("PASS existing Customer, cash confirmation and retry with identical key/payload; no page errors");
 const guest = await browser.newPage();
 await guest.goto(`${origin}/staff/orders/new`);
 await guest.waitForURL(`${origin}/login`);
 console.log("PASS direct unauthenticated new-order route redirects to login");
 console.log(`Screenshots: ${screenshots}`);
} catch (error) {
 console.error("Fixture browser failure:", page?.url(), await page?.locator("body").innerText().catch(() => "no page"));
 console.error(serverOutput);
 throw error;
} finally {
 await browser?.close();
 next.kill();
 await new Promise((yes) => fixture.close(yes));
}
