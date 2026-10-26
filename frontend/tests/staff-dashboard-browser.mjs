// Isolated API fixtures, never contacts the application backend/Firebase.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { mkdir, mkdtemp, cp, symlink, readFile, writeFile } from "node:fs/promises";
import { user, overviewFixture, salesFixture, performanceFixture } from "./fixtures/staff-analytics.mjs";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const frontend = fileURLToPath(new URL("../", import.meta.url));
const origin = "http://127.0.0.1:3025";
const dev = process.env.STAFF_DASHBOARD_TEST_DEV === "1";
let appDirectory = frontend;
if (dev) {
  const parent = resolve(frontend, ".next/staff-dashboard-tests");
  await mkdir(parent, { recursive: true });
  appDirectory = await mkdtemp(resolve(parent, "app-"));
  for (const entry of ["app", "features", "components", "lib", "public", "package.json", "tsconfig.json", "next.config.ts", "next-env.d.ts"]) {
    await cp(resolve(frontend, entry), resolve(appDirectory, entry), { recursive: true });
  }
  await symlink(resolve(frontend, "node_modules"), resolve(appDirectory, "node_modules"), "junction");
  if (process.env.STAFF_DASHBOARD_TEST_WEBPACK === "1") {
    // Compatibility QA only: run the existing Tailwind loader through Webpack in the copy.
    // This does NOT change production config or claim that the Turbopack build passed.
    const configPath = resolve(appDirectory, "next.config.ts");
    const config = await readFile(configPath, "utf8");
    await writeFile(configPath, config.replace("export default nextConfig;", `
nextConfig.webpack = (config) => {
  config.module.rules.push({ test: /globals\\.css$/, enforce: "pre", use: ["@tailwindcss/turbopack"] });
  return config;
};
export default nextConfig;`));
  }
}
let empty = false, failure = false, delay = 0, role = "staff", requests = [];
const ok = (data) => ({ status: 200, body: { success: true, data } });
const fail = (status, code) => ({ status, body: { success: false, error: { code } } });
async function api(url, headers) {
  const path = url.pathname;
  if (["/api/v1/auth/me", "/api/v1/staff/dashboard"].includes(path)) {
    if (!headers.cookie?.includes("petly-session")) return fail(401, "UNAUTHENTICATED");
    if (path.includes("staff") && role !== "staff") return fail(403, "FORBIDDEN");
    return ok({ user: { ...user, role } });
  }
  if (path.includes("/analytics/")) {
    requests.push(url.search);
    if (delay) await new Promise((yes) => setTimeout(yes, delay));
    if (failure) return fail(503, "ANALYTICS_UNAVAILABLE");
    if (role !== "staff") return fail(403, "FORBIDDEN");
    if (path.endsWith("/overview")) return ok(overviewFixture(empty));
    if (path.endsWith("/sales")) return ok(salesFixture(url.searchParams, empty));
    if (path.endsWith("/performance")) return ok(performanceFixture(url.searchParams, empty));
  }
  if (path.includes("/cart")) return ok({ items: [], summary: { subtotal: 0, total: 0, totalItems: 0 } });
  return fail(404, "NOT_FOUND");
}
const fixture = createServer(async (req, res) => {
  const result = await api(new URL(req.url, origin), req.headers);
  res.writeHead(result.status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(result.body));
});
await new Promise((yes, no) => fixture.once("error", no).listen(3135, "127.0.0.1", yes));
const child = spawn(process.execPath, [resolve(frontend, "node_modules/next/dist/bin/next"), dev ? "dev" : "start",
  ...(process.env.STAFF_DASHBOARD_TEST_WEBPACK === "1" ? ["--webpack"] : []), "-p", "3025", "-H", "127.0.0.1"], {
  cwd: appDirectory, windowsHide: true, env: { ...process.env, BACKEND_ORIGIN: "http://127.0.0.1:3135" }, stdio: ["ignore", "pipe", "pipe"],
});
let logs = "", browser;
child.stdout.on("data", (b) => { logs += b; }); child.stderr.on("data", (b) => { logs += b; });
try {
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (await fetch(`${origin}/api/v1/staff/dashboard`, { signal: AbortSignal.timeout(3000) }).then(() => true, () => false)) break;
    await new Promise((yes) => setTimeout(yes, 200));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: dev ? "petly-session" : "__Host-petly-session", value: "fixture-only", url: dev ? origin : "https://127.0.0.1:3025", secure: !dev, httpOnly: true, sameSite: "Lax" }]);
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request(), result = await api(new URL(req.url()), await req.allHeaders());
    await route.fulfill({ status: result.status, contentType: "application/json", body: JSON.stringify(result.body) });
  });
  const page = await context.newPage(), errors = [];
  page.setDefaultNavigationTimeout(90000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${origin}/staff/dashboard`);
  await page.getByText("Sản phẩm tồn thấp từ API", { exact: true }).waitFor({ timeout: 60000 });
  await page.getByRole("heading", { name: /Chào Nhân viên kiểm thử/ }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Chi tiết", exact: false }).getAttribute("href"), `/staff/orders/${"c".repeat(24)}`);
  assert.equal(await page.getByText("08:00 – 17:00 · Kho TP.HCM").count(), 0);
  const screenshots = resolve(frontend, ".next/staff-dashboard-browser"); await mkdir(screenshots, { recursive: true });
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1024 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    const display = await page.locator('section[aria-label="Chỉ số hôm nay"]').evaluate((el) => getComputedStyle(el).display);
    assert.equal(display, "grid", "Compiled Tailwind styles are required for visual QA");
    await page.screenshot({ path: resolve(screenshots, `overview-${width}.png`), fullPage: true });
  }
  await page.getByText("Xem bảng dữ liệu", { exact: true }).click();
  await page.keyboard.press("Tab");
  failure = true; await page.getByRole("button", { name: "Tải lại dữ liệu" }).click();
  await page.getByRole("alert").filter({ hasText: "Chưa thể tải báo cáo" }).waitFor(); assert.equal(await page.getByText("LIVE-ORDER", { exact: true }).count(), 0);
  failure = false; empty = true; await page.getByRole("button", { name: "Thử lại" }).click();
  await page.getByText("Không có đơn chờ tiếp nhận.", { exact: true }).waitFor();
  delay = 500; empty = false; await page.getByRole("button", { name: "Tải lại dữ liệu" }).click();
  await page.getByText("Đang tải báo cáo…", { exact: true }).waitFor();
  await page.getByText("LIVE-ORDER", { exact: true }).waitFor(); delay = 0;
  if (process.env.STAFF_DASHBOARD_TEST_SALES === "1") {
    await page.getByRole("link", { name: "Doanh số", exact: true }).filter({ visible: true }).click();
    await page.getByRole("heading", { name: "Thống kê doanh số" }).waitFor();
    await page.getByText("Sản phẩm từ API", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Xuất báo cáo" }).count(), 0);
    await page.getByLabel("Từ ngày", { exact: true }).filter({ visible: true }).fill("2026-09-01");
    await page.getByLabel("Đến ngày", { exact: true }).filter({ visible: true }).fill("2026-09-30");
    await page.getByRole("combobox", { name: /Nhóm theo/ }).selectOption("week");
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await page.getByRole("heading", { name: "Doanh số theo tuần", exact: true }).waitFor();
    assert.match(page.url(), /dateFrom=2026-09-01/); assert.ok(requests.some((q) => q.includes("groupBy=week")));
    await page.reload(); await page.getByRole("heading", { name: "Doanh số theo tuần", exact: true }).waitFor();
    assert.equal(await page.getByLabel("Từ ngày", { exact: true }).filter({ visible: true }).inputValue(), "2026-09-01");
    await page.getByRole("combobox", { name: /Nhóm theo/ }).selectOption("month");
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await page.getByRole("heading", { name: "Doanh số theo tháng", exact: true }).waitFor();
    await page.goBack(); await page.getByRole("heading", { name: "Doanh số theo tuần", exact: true }).waitFor();
    await page.goForward(); await page.getByRole("heading", { name: "Doanh số theo tháng", exact: true }).waitFor();
    await page.getByLabel("Từ ngày", { exact: true }).filter({ visible: true }).fill("2026-10-20");
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await page.getByText("Chọn khoảng ngày hợp lệ, tối đa 366 ngày.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "7 ngày gần nhất", exact: true }).click();
    await page.getByRole("heading", { name: "Doanh số theo ngày", exact: true }).waitFor();
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1024 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      assert.ok((await page.getByLabel("Từ ngày", { exact: true }).filter({ visible: true }).boundingBox()).width >= 140, "Date control must remain readable");
      await page.screenshot({ path: resolve(screenshots, `sales-${width}.png`), fullPage: true });
    }
    empty = true; await page.getByRole("button", { name: "Tải lại dữ liệu" }).click();
    await page.getByText(/Chưa có đơn hoàn thành và đã thanh toán trong kỳ này/).waitFor();
    failure = true; await page.getByRole("button", { name: "Tải lại dữ liệu" }).click();
    await page.getByRole("alert").filter({ hasText: "Chưa thể tải báo cáo" }).waitFor();
    failure = false; empty = false; await page.getByRole("button", { name: "Thử lại" }).click();
    await page.getByText("Sản phẩm từ API", { exact: true }).waitFor();
    delay = 1000;
    const slowRequest = page.waitForRequest((request) => request.url().includes("analytics/sales?groupBy=week"));
    await page.evaluate(() => window.history.pushState(null, "", "/staff/sales?groupBy=week"));
    await slowRequest;
    // Allow the delayed fixture handler to start before the new query is issued.
    await new Promise((yes) => setTimeout(yes, 100));
    delay = 0;
    await page.evaluate(() => window.history.pushState(null, "", "/staff/sales?groupBy=month"));
    await page.getByRole("heading", { name: "Doanh số theo tháng", exact: true }).waitFor();
    await new Promise((yes) => setTimeout(yes, 1100));
    assert.equal(await page.getByRole("heading", { name: "Doanh số theo tháng", exact: true }).count(), 1);
    assert.equal(await page.getByRole("heading", { name: "Doanh số theo tuần", exact: true }).count(), 0);
    console.log("PASS delayed old query cannot overwrite the new sales report.");
    console.log("PASS sales period/group filters, URL reload/back/forward, validation, empty/error/retry and responsive.");
  }
  if (process.env.STAFF_DASHBOARD_TEST_PERFORMANCE === "1") {
    await page.getByRole("link", { name: "Hiệu suất cá nhân", exact: true }).filter({ visible: true }).click();
    await page.getByRole("heading", { name: "Hiệu suất cá nhân", exact: true }).waitFor();
    await page.getByText("Xác nhận đơn", { exact: true }).waitFor();
    assert.equal(await page.getByText("Chưa có dữ liệu", { exact: true }).count(), 3);
    assert.equal(await page.getByRole("combobox").count(), 0);
    await page.getByLabel("Từ ngày", { exact: true }).filter({ visible: true }).fill("2026-10-01");
    await page.getByRole("button", { name: "Áp dụng", exact: true }).focus(); await page.keyboard.press("Enter");
    await page.waitForURL(/dateFrom=2026-10-01/); await page.getByText("Xác nhận đơn", { exact: true }).waitFor();
    assert.ok(!new URL(page.url()).searchParams.has("staffId"));
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1024 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      assert.ok((await page.getByLabel("Từ ngày", { exact: true }).filter({ visible: true }).boundingBox()).width >= 140);
      await page.screenshot({ path: resolve(screenshots, `performance-${width}.png`), fullPage: true });
    }
    failure = true; await page.getByRole("button", { name: "Tải lại dữ liệu" }).click();
    await page.getByRole("alert").filter({ hasText: "Chưa thể tải báo cáo" }).waitFor();
    assert.equal(await page.getByText("Xác nhận đơn", { exact: true }).count(), 0);
    failure = false; empty = true; await page.getByRole("button", { name: "Thử lại" }).click();
    await page.getByText("Bạn chưa có hoạt động được ghi nhận trong kỳ này.", { exact: true }).waitFor();
    user.id = "d".repeat(24); user.fullName = "Nhân viên thứ hai";
    await page.reload(); await page.getByText(/Nhân viên thứ hai · Chỉ hiển thị/).waitFor();
    assert.equal(await page.getByText("LIVE-ORDER", { exact: true }).count(), 0);
    role = "customer"; await page.reload(); await page.waitForURL(/\/forbidden/);
    role = "staff"; empty = false;
    console.log("PASS performance personal identity, dates, unavailable KPI, activity, empty/error/retry, second actor, role change and responsive.");
  }
  const guest = await browser.newContext(), guestPage = await guest.newPage();
  for (const screen of ["dashboard", "sales", "performance"]) {
    await guestPage.goto(`${origin}/staff/${screen}`); await guestPage.waitForURL(/\/login/);
  }
  await guest.close();
  for (const deniedRole of ["admin", "customer"]) {
    role = deniedRole;
    for (const screen of ["dashboard", "sales", "performance"]) {
      await page.goto(`${origin}/staff/${screen}`); await page.waitForURL(/\/forbidden/);
    }
  }
  role = "staff";
  console.log("PASS direct access guards on all three routes for guest, customer and admin.");
  for (const screen of ["dashboard", "sales", "performance"]) {
    await page.goto(`${origin}/staff/${screen}`);
    await page.getByRole("button", { name: "Tải lại dữ liệu" }).waitFor();
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });
  }
  console.log("PASS 200% CSS zoom reflow on all reports (not native browser zoom).");
  assert.deepEqual(errors, []);
  console.log(`PASS overview navigation, identity, real DTO display, empty/error/retry/loading, guest guard, responsive styles and keyboard (${dev ? "development" : "production"}).`);
} catch (error) { console.error(logs.slice(-5000)); throw error; }
finally { await browser?.close(); child.kill(); await new Promise((yes) => fixture.close(yes)); }
