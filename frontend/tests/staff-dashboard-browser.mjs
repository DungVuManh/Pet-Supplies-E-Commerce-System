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
  const guest = await browser.newContext(), guestPage = await guest.newPage();
  await guestPage.goto(`${origin}/staff/dashboard`); await guestPage.waitForURL(/\/login/);
  await guest.close();
  assert.deepEqual(errors, []);
  console.log(`PASS overview navigation, identity, real DTO display, empty/error/retry/loading, guest guard, responsive styles and keyboard (${dev ? "development" : "production"}).`);
} catch (error) { console.error(logs.slice(-5000)); throw error; }
finally { await browser?.close(); child.kill(); await new Promise((yes) => fixture.close(yes)); }
