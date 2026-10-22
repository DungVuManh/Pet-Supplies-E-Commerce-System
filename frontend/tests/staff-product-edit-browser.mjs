// Isolated fixture data; browser requests never reach the application's backend.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const frontend = fileURLToPath(new URL("../", import.meta.url));
const origin = "http://127.0.0.1:3024", sku = "LIVE-SKU-NEW";
const user = { id: "b".repeat(24), role: "staff", fullName: "Staff kiểm thử", phone: "0912345678", email: "staff@example.test" };
const product = { productId: "a".repeat(24), sku, name: "Sản phẩm mới từ API", category: "Thức ăn", brand: "Petly", weight: "1 kg",
  description: "Mô tả ban đầu", physical: 10, reserved: 3, price: 100000, threshold: 5,
  location: "Kệ A1", image: "/images/products/royal-canin-mini-adult.png", updated: "23/10", status: "active" };
let submissions = [], lost = false, readFailure = false;
const snapshot = () => ({ physical: product.physical, reserved: product.reserved, status: product.status, description: product.description });
async function api(path, method, body, headers) {
  const ok = (data) => ({ status: 200, body: { success: true, data } });
  const fail = (code, status) => ({ status, body: { success: false, error: { code } } });
  if (["/api/v1/auth/me", "/api/v1/staff/dashboard"].includes(path)) return ok({ user });
  if (path === "/api/v1/auth/csrf") return ok({ csrfToken: "x".repeat(43) });
  if (path !== `/api/v1/staff/products/${sku}`) return fail("NOT_FOUND", 404);
  if (method === "GET") return readFailure ? fail("PRODUCTS_UNAVAILABLE", 503) : ok({ ...product, availableStock: product.physical - product.reserved });
  if (method !== "PATCH") return fail("NOT_FOUND", 404);
  assert.equal(headers["x-csrf-token"], "x".repeat(43));
  submissions.push(body);
  if (JSON.stringify(body.expected) !== JSON.stringify(snapshot())) return fail("PRODUCT_CHANGED", 409);
  Object.assign(product, { physical: body.physical, status: body.status, description: body.description });
  await new Promise((yes) => setTimeout(yes, 150));
  if (lost) { lost = false; return fail("PRODUCTS_UNAVAILABLE", 503); }
  return ok({ sku });
}
const fixture = createServer(async (request, response) => {
  const result = await api(new URL(request.url, origin).pathname, request.method, null, request.headers);
  response.writeHead(result.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(result.body));
});
await new Promise((yes, no) => fixture.once("error", no).listen(3134, "127.0.0.1", yes));
const next = spawn(process.execPath, [resolve(frontend, "node_modules/next/dist/bin/next"), "start", "-p", "3024", "-H", "127.0.0.1"], {
  cwd: frontend, windowsHide: true, env: { ...process.env, BACKEND_ORIGIN: "http://127.0.0.1:3134" }, stdio: ["ignore", "pipe", "pipe"],
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
  await context.addCookies([{ name: "__Host-petly-session", value: "fixture-session-not-a-real-token", url: "https://127.0.0.1:3024", secure: true, httpOnly: true, sameSite: "Lax" }]);
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request(), result = await api(new URL(req.url()).pathname, req.method(), req.postDataJSON(), req.headers());
    await route.fulfill({ status: result.status, contentType: "application/json", body: JSON.stringify(result.body) });
  });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const editUrl = `${origin}/staff/products/${sku}/edit`;
  await page.goto(editUrl);
  const quantity = page.getByRole("spinbutton", { name: /Số lượng thực tế/ });
  const description = page.getByRole("textbox", { name: /^Mô tả/ });
  const save = page.getByRole("button", { name: "Lưu thay đổi", exact: true });
  await quantity.waitFor(); assert.equal(await quantity.inputValue(), "10");
  assert.equal(await page.locator("textarea").count(), 1);
  assert.equal(await description.inputValue(), product.description);
  await quantity.fill(""); await save.click();
  assert.equal(await quantity.evaluate((el) => el === document.activeElement), true);
  assert.equal(submissions.length, 0);
  await quantity.fill("2"); await save.click();
  await page.getByText("Số lượng thực tế không được nhỏ hơn 3 sản phẩm đang giữ chỗ.", { exact: true }).waitFor();
  await quantity.fill("12"); await description.fill("   "); await save.click();
  assert.equal(await description.evaluate((el) => el === document.activeElement), true);
  await description.fill("  Mô tả đã chỉnh  ");
  await page.getByRole("combobox", { name: /Trạng thái hiển thị/ }).selectOption("hidden");
  await save.focus(); await page.keyboard.press("Enter");
  await page.waitForURL(`${origin}/staff/products/${sku}`);
  await page.getByText("Mô tả đã chỉnh", { exact: true }).filter({ visible: true }).waitFor();
  assert.equal(submissions.length, 1);
  assert.deepEqual(submissions[0].expected, { physical: 10, reserved: 3, status: "active", description: "Mô tả ban đầu" });
  await page.getByRole("link", { name: "Chỉnh sửa sản phẩm" }).click();
  await quantity.waitFor(); assert.equal(await quantity.inputValue(), "12");
  assert.equal(await description.inputValue(), "Mô tả đã chỉnh");
  await quantity.fill("13"); await description.fill("Mô tả lần hai"); await save.click();
  await page.waitForURL(`${origin}/staff/products/${sku}`);
  await page.getByText("Mô tả lần hai", { exact: true }).filter({ visible: true }).waitFor();
  assert.deepEqual(submissions.at(-1).expected, { physical: 12, reserved: 3, status: "hidden", description: "Mô tả đã chỉnh" });
  await page.getByRole("link", { name: "Chỉnh sửa sản phẩm" }).click();
  await quantity.waitFor(); assert.equal(await quantity.inputValue(), "13");
  product.physical = 14;
  await quantity.fill("15"); await save.click();
  await page.getByRole("button", { name: "Tải lại sản phẩm" }).waitFor();
  assert.equal(await quantity.isDisabled(), true); assert.equal(product.physical, 14);
  await page.getByRole("button", { name: "Tải lại sản phẩm" }).click();
  await quantity.waitFor(); assert.equal(await quantity.inputValue(), "14");
  lost = true;
  await quantity.fill("15"); await description.fill("Đã lưu dù mất phản hồi"); await save.click();
  await page.getByRole("button", { name: "Tải lại sản phẩm" }).waitFor();
  assert.equal(product.physical, 15);
  await page.getByRole("button", { name: "Tải lại sản phẩm" }).click();
  await quantity.waitFor(); assert.equal(await quantity.inputValue(), "15");
  assert.equal(await description.inputValue(), "Đã lưu dù mất phản hồi");
  assert.deepEqual(errors, []);
  readFailure = true; await page.reload();
  await page.getByRole("heading", { name: "Chưa thể tải sản phẩm" }).waitFor();
  readFailure = false; await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await quantity.waitFor(); assert.equal(await quantity.inputValue(), "15");
  console.log("PASS real SKU load, single description, validation/focus, keyboard save, persisted detail/re-edit, conflict reload, lost-response recovery and load-error retry");
  const panel = page.getByRole("heading", { name: "Trạng thái & tồn kho" }).locator("..");
  assert.equal(await panel.evaluate((el) => getComputedStyle(el).paddingTop), "24px",
    "Visual checks require compiled Tailwind CSS; Webpack does not run this project's Turbopack-only CSS loader.");
  const screenshots = resolve(frontend, ".next/staff-product-edit-browser"); await mkdir(screenshots, { recursive: true });
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1024 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `body overflow ${width}`);
    await page.screenshot({ path: resolve(screenshots, `edit-${width}.png`), fullPage: true });
  }
  console.log("PASS responsive layouts");
} finally {
  await browser?.close(); next.kill(); fixture.closeAllConnections();
  await new Promise((yes) => fixture.close(yes));
}
