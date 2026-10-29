import test from "node:test";
import assert from "node:assert/strict";
import { fetchReport, parseReport, AnalyticsApiError } from "../features/staff/analytics/services/analytics.service.ts";
import { periodError, reportQuery } from "../features/staff/analytics/query.ts";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";

const period = { dateFrom: "2026-10-20", dateTo: "2026-10-26", groupBy: "day" };
const summary = { revenue: 100, orderCount: 1, averageOrderValue: 100 };
const sales = { generatedAt: "2026-10-26T03:00:00Z", timezone: "Asia/Ho_Chi_Minh", scope: "store", period, summary,
  series: [{ date: "2026-10-26", value: 100 }], growthPercent: null, topProducts: [],
  previousPeriod: { period, summary }, today: { period, summary }, monthToDate: { period, summary } };
const performance = { generatedAt: sales.generatedAt, timezone: sales.timezone, scope: "self", period,
  actor: { id: "a".repeat(24), fullName: "Staff" }, processedOrders: 1, actionCount: 3, cancelledOrders: 1,
  previousProcessedOrders: 0, todayProcessedOrders: 1, series: [{ date: "2026-10-26", value: 1 }], activity: [],
  unsupported: { averageProcessingMinutes: null, onTimeRate: null, target: null } };
const envelope = (data) => ({ success: true, data });
test("parses reports and rejects fabricated/invalid money and periods", () => {
  assert.equal(parseReport("sales", envelope(sales)).summary.revenue, 100);
  for (const patch of [{ summary: { ...summary, revenue: -1 } }, { summary: { ...summary, revenue: 1.1 } },
    { summary: { ...summary, revenue: Number.MAX_SAFE_INTEGER + 1 } }, { period: { ...period, dateFrom: "2026-02-30" } },
    { series: [{ date: "2026-10-26", value: 99 }] }, { scope: "self" }, { growthPercent: Infinity }, { generatedAt: "bad" }]) {
    assert.throws(() => parseReport("sales", envelope({ ...sales, ...patch })), AnalyticsApiError);
  }
});
test("personal DTO validates identities/actions and unsupported metrics", () => {
  assert.equal(parseReport("performance", envelope(performance)).processedOrders, 1);
  for (const patch of [{ actor: { id: "other", fullName: "Staff" } }, { unsupported: { ...performance.unsupported, target: 32 } },
    { processedOrders: 2 }, { activity: [{ orderId: "b".repeat(24), orderCode: "TEST", action: "completed", at: sales.generatedAt }] }]) {
    assert.throws(() => parseReport("performance", envelope({ ...performance, ...patch })));
  }
});
test("overview validates totals and bounds rather than treating malformed data as empty", () => {
  const value = { ...sales, sales, personal: performance, backlog: { pending: 0, confirmed: 0, processing: 0, total: 0, items: [] },
    stock: { threshold: 10, low: 0, out: 0, total: 0, items: [] } };
  assert.equal(parseReport("overview", envelope(value)).stock.total, 0);
  assert.throws(() => parseReport("overview", envelope({ ...value, backlog: { ...value.backlog, total: 9 } })));
  assert.throws(() => parseReport("overview", { success: false }));
});
test("date queries serialize without actor selection and validate calendar/range", () => {
  assert.equal(reportQuery(period), "dateFrom=2026-10-20&dateTo=2026-10-26&groupBy=day");
  assert.equal(reportQuery(period, true), "dateFrom=2026-10-20&dateTo=2026-10-26");
  assert.equal(periodError(period), null);
  for (const patch of [{ dateFrom: "" }, { dateTo: "2026-10-01" }, { dateFrom: "2026-02-30" }, { dateFrom: "2024-01-01" }]) assert.ok(periodError({ ...period, ...patch }));
});
test("client preserves credentials/no-store, HTTP status and abort", async (t) => {
  let call;
  t.mock.method(globalThis, "fetch", async (url, options) => { call = { url, options }; return Response.json(envelope(sales)); });
  const abort = new AbortController();
  await fetchReport("sales", reportQuery(period), abort.signal);
  assert.ok(call.url.startsWith("/api/v1/staff/analytics/sales?"));
  assert.equal(call.options.credentials, "include"); assert.equal(call.options.cache, "no-store");
  abort.abort(); assert.equal(call.options.signal.aborted, true);
  for (const status of [400, 401, 403, 409, 429, 503]) {
    t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: { code: "TEST_ERROR" } }, { status }));
    await assert.rejects(fetchReport("sales", "", new AbortController().signal), (error) => error.status === status && error.code === "TEST_ERROR");
  }
});
test("shared chart renders empty/zero/positive values without NaN or fake positive bars", () => {
  const require = createRequire(import.meta.url), ts = require("typescript"), React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const path = fileURLToPath(new URL("../components/workspace/workspace-ui.tsx", import.meta.url));
  const source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const compiled = new Module(path); compiled.filename = path; compiled.paths = Module._nodeModulePaths(fileURLToPath(new URL("../", import.meta.url)));
  compiled._compile(source, path);
  const chart = (data) => renderToStaticMarkup(React.createElement(compiled.exports.BarChart, { title: "Test", subtitle: "", unit: "đơn", data }));
  assert.match(chart([]), /Chưa có dữ liệu/);
  const zero = chart([{ label: "26/10", value: 0 }]);
  assert.doesNotMatch(zero, /NaN|Infinity/); assert.match(zero, /opacity:0/);
  const positive = chart([{ label: "26/10", value: 8 }]);
  assert.match(positive, /opacity:1/); assert.match(positive, /Xem bảng dữ liệu/);
});
