// Isolated UI check: fixtures never connect to Firebase or MongoDB.
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
const origin = "http://127.0.0.1:3021";
const user = { id: "b".repeat(24), fullName: "Nhân viên kiểm thử", email: "staff@example.test", phone: "0912345678", role: "staff" };
const items = [
  { sku: "TEST-1", name: "Thức ăn mèo", category: "Thức ăn", physical: 20, reserved: 3, availableStock: 17, stockStatus: "available", status: "active" },
  { sku: "TEST-2", name: "Bóng cao su", category: "Đồ chơi", physical: 5, reserved: 2, availableStock: 3, stockStatus: "low", status: "active" },
  { sku: "TEST-3", name: "Dây dắt", category: "Phụ kiện", physical: 2, reserved: 2, availableStock: 0, stockStatus: "out", status: "hidden" },
].map((p) => ({ ...p, brand: "Petly", weight: "1 hộp", price: 100000, threshold: 5, updated: "22/10/2026" }));
const fixture = createServer((request, response) => {
  const path = new URL(request.url, origin).pathname;
  const data = path === "/api/v1/staff/products"
    ? { items, categories: items.map((p) => p.category), summary: { totalProducts: 3, totalActive: 2, totalHidden: 1 } }
    : { user };
  response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify({ success: true, data }));
});
await new Promise((yes, no) => fixture.once("error", no).listen(3131, "127.0.0.1", yes));
const next = spawn(process.execPath, [resolve(frontend, "node_modules/next/dist/bin/next"), "start", "-p", "3021", "-H", "127.0.0.1"], {
  cwd: frontend, windowsHide: true, env: { ...process.env, BACKEND_ORIGIN: "http://127.0.0.1:3131" }, stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
next.stdout.on("data", (b) => { serverOutput += b; });
next.stderr.on("data", (b) => { serverOutput += b; });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    if (next.exitCode !== null) throw new Error(serverOutput);
    if (await fetch(origin).then((r) => r.ok, () => false)) break;
    await new Promise((yes) => setTimeout(yes, 200));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  // Intercept browser calls before the build's API rewrites can reach another backend.
  await context.route("**/api/v1/**", (route) => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ success: true, data:
      new URL(route.request().url()).pathname === "/api/v1/staff/products"
        ? { items, categories: items.map((p) => p.category), summary: { totalProducts: 3, totalActive: 2, totalHidden: 1 } }
        : { user },
    }),
  }));
  await context.addCookies([{ name: "__Host-petly-session", value: "fixture-session-not-a-real-token", url: "https://127.0.0.1:3021", secure: true, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/staff/inventory`);
  await page.waitForURL(`${origin}/staff/products`);
  await page.getByRole("cell", { name: "TEST-1", exact: false }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Tồn kho", exact: true }).count(), 0);
  assert.equal(await page.getByRole("columnheader", { name: "Số lượng", exact: true }).count(), 1);
  for (const item of items) {
    const row = page.getByRole("row").filter({ has: page.getByText(item.sku, { exact: true }) });
    for (const text of [`${item.physical} thực tế`, `${item.reserved} giữ chỗ`, `${item.availableStock} khả dụng`]) {
      assert.equal(await row.getByText(text, { exact: true }).count(), 1);
    }
  }
  for (const text of ["1 còn hàng", "1 sắp hết", "1 hết hàng"]) {
    assert.equal(await page.getByText(text, { exact: true }).count(), 1);
  }
  await page.getByRole("combobox", { name: /Tồn khả dụng/ }).selectOption("low");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByRole("cell", { name: "TEST-2", exact: false }).waitFor();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("tbody tr").count(), 3);
  await page.getByLabel("Tìm kiếm", { exact: true }).fill("khong-ton-tai");
  await page.getByText("Không có sản phẩm phù hợp.").waitFor();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  assert.deepEqual(errors, []);
  console.log("PASS inventory redirect, navigation, quantities, stock summaries/filter, empty state and keyboard reset");
  assert.equal(await page.locator("table").evaluate((table) => getComputedStyle(table.parentElement).overflowX), "auto",
    "Layout verification requires the project's compiled Tailwind CSS; the Webpack fallback does not process its Turbopack-only CSS loader.");
  const screenshots = resolve(frontend, ".next/staff-products-browser");
  await mkdir(screenshots, { recursive: true });
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1024 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `body overflow ${width}`);
    await page.screenshot({ path: resolve(screenshots, `products-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log("PASS responsive layouts");
} finally {
  await browser?.close();
  next.kill();
  await new Promise((yes) => fixture.close(yes));
}
