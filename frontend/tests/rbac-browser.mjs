// Optional UI smoke check against a running dev server; fixtures affect browser /me only.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
const output = fileURLToPath(new URL("../.next/rbac-browser/screenshots/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const role of [null, "customer", "staff", "admin"]) {
    const context = await browser.newContext();
    let activeRole = role;
    await context.route("**/api/v1/auth/me", (route) => route.fulfill({
      status: activeRole ? 200 : 401, contentType: "application/json",
      body: JSON.stringify(activeRole ? { success: true, data: { user: {
        id: `test-${role}`, role, email: `${role}@example.test`,
        fullName: `Tài khoản kiểm thử ${role}`, phone: "0912345678",
      } } } : { success: false, error: { code: "UNAUTHENTICATED" } }),
    }));
    await context.route("**/api/v1/auth/csrf", (route) => route.fulfill({
      contentType: "application/json", body: JSON.stringify({ success: true, data: { csrfToken: "x".repeat(43) } }),
    }));
    await context.route("**/api/v1/auth/session", (route) => {
      assert.equal(route.request().method(), "DELETE");
      activeRole = null;
      return route.fulfill({ status: 204 });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1024 });
      if (role) {
        const account = page.getByLabel(`Tài khoản Tài khoản kiểm thử ${role}`);
        await account.focus();
        await page.keyboard.press("Enter");
        const links = page.getByRole("link", { name: /Dashboard/ });
        assert.equal(await links.count(), role === "customer" ? 0 : 1);
        if (role !== "customer") assert.equal(await links.getAttribute("href"), `/${role}/dashboard`);
        await page.getByRole("button", { name: "Đăng xuất", exact: true }).waitFor();
        await page.screenshot({ path: resolve(output, `${role}-menu-${width}.png`), fullPage: true });
        await page.keyboard.press("Enter");
      } else {
        await page.getByRole("link", { name: "Đăng nhập", exact: true }).waitFor();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    }
    // No session cookie is installed: even a forged client /me role cannot open a server-protected page.
    for (const target of ["staff", "admin"]) {
      await page.goto(`${origin}/${target}/dashboard`, { waitUntil: "domcontentloaded" });
      await page.waitForURL(`${origin}/login`);
      assert.equal(await page.getByRole("heading", { name: "Thông tin tài khoản" }).count(), 0);
    }
    await page.goto(`${origin}/forbidden`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Bạn không có quyền truy cập chức năng này." }).waitFor();
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1024 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    }
    if (role) {
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      await page.getByLabel(`Tài khoản Tài khoản kiểm thử ${role}`).click();
      await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
      await page.getByRole("link", { name: "Đăng nhập", exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${role ?? "guest"}: responsive profile menu, keyboard, server redirects, forbidden page, logout`);
  }
} finally {
  await browser.close();
}
