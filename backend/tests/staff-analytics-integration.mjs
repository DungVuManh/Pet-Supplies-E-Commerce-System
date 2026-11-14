// Real aggregates, isolated UUID database. Never loads .env or uses an application database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import mongoose from "mongoose";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { Payment } from "../src/models/payment.model.js";
import { parseAnalyticsQuery } from "../src/validators/staff-analytics.validator.js";
import { readSales, readPerformance, readOverview, salesPipeline } from "../src/controllers/staff-analytics.helpers.js";

const dbName = `petly_analytics_test_${randomUUID().replaceAll("-", "")}`;
let child, logs = "";
let uri = process.env.STAFF_ANALYTICS_TEST_MONGODB_URI;
if (!uri) {
  if (!process.env.MONGOD_BINARY) throw new Error("Set MONGOD_BINARY or STAFF_ANALYTICS_TEST_MONGODB_URI (test server only)");
  const socket = createServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const directory = await mkdtemp(join(tmpdir(), "staff-analytics-"));
  child = spawn(process.env.MONGOD_BINARY, ["--dbpath", directory, "--port", String(port), "--bind_ip", "127.0.0.1"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (b) => { logs += b; }); child.stderr.on("data", (b) => { logs += b; });
  child.on("error", (e) => { logs += e.message; });
  uri = `mongodb://127.0.0.1:${port}`;
}
try {
  await mongoose.connect(uri, { dbName, autoIndex: false, serverSelectionTimeoutMS: 15000 });
  assert.equal(mongoose.connection.name, dbName);
  const a = new mongoose.Types.ObjectId(), b = new mongoose.Types.ObjectId(), customer = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const now = new Date("2026-10-26T05:00:00Z");
  const date = (day, hour = "10:00") => new Date(`2026-10-${day}T${hour}:00+07:00`);
  let n = 0;
  const order = (patch = {}) => ({ _id: new mongoose.Types.ObjectId(), orderCode: `TEST-${++n}`,
    channel: "online", createdAt: date(26), orderStatus: "completed", paymentStatus: "paid", subtotal: 200,
    total: 200, items: [{ productId, variantSku: "SKU-1", name: "Snapshot name", unitPrice: 100, qty: 2 }], ...patch });
  // Raw collection deliberately includes legacy records that current schema cannot create.
  const records = [order(), order({ orderStatus: "delivered", createdAt: date(25) }),
    order({ channel: "offline", createdByStaffId: a, statusHistory: [{ to: "completed", by: a, at: date(26) }] }),
    order({ paymentStatus: "unpaid" }), order({ paymentStatus: "refunded" }), order({ orderStatus: "cancelled" }),
    order({ creationState: "pending", channel: "offline", createdByStaffId: a }),
    order({ createdAt: date(19, "23:59") }), order({ createdAt: date(27, "00:00") }),
    order({ createdAt: date(20, "00:00"), statusHistory: [
      { from: "pending", to: "confirmed", by: a, at: date(20) },
      { from: "confirmed", to: "processing", by: a, at: date(21) },
      { from: "processing", to: "shipping", by: b, at: date(22) },
      { from: "shipping", to: "completed", by: customer, at: date(26) },
    ] }),
    order({ orderStatus: "cancelled", statusHistory: [{ from: "pending", to: "cancelled", by: a, at: date(26) }] }),
    ...Array.from({ length: 5 }, () => order({ orderStatus: "pending", paymentStatus: "unpaid" })),
    order({ orderStatus: "confirmed" }), order({ orderStatus: "processing" }),
    order({ orderStatus: "pending", creationState: "pending" }),
  ];
  await Order.collection.insertMany(records);
  await Payment.collection.insertMany([1, 2].map((i) => ({ orderId: records[0]._id, amount: 200, status: "paid", transactionRef: `T${i}` })));
  await Product.collection.insertMany([{ _id: productId, name: "Current name", isActive: true,
    variants: [{ sku: "SKU-1", stock: 10, reservedStock: 3, price: 9999 },
      { sku: "SKU-ZERO", stock: 2, reservedStock: 2 }, { sku: "SKU-HIGH", stock: 20, reservedStock: 0 }] },
    { isActive: false, name: "Hidden", variants: [{ sku: "HIDDEN", stock: 0, reservedStock: 0 }] }]);
  const p = parseAnalyticsQuery({ dateFrom: "2026-10-20", dateTo: "2026-10-26" }, "sales", now);
  const sales = await readSales(p, now);
  assert.equal(sales.summary.revenue, 800); assert.equal(sales.summary.orderCount, 4);
  assert.equal(sales.today.summary.revenue, 400); assert.equal(sales.previousPeriod.summary.revenue, 200);
  assert.equal(sales.growthPercent, 300); assert.equal(sales.topProducts[0].quantity, 8);
  assert.equal(sales.topProducts[0].name, "Snapshot name");
  assert.equal(sales.series.reduce((sum, d) => sum + d.value, 0), 800);
  const perf = await readPerformance(p, { _id: a, fullName: "A" }, now);
  assert.equal(perf.processedOrders, 2); assert.equal(perf.actionCount, 4); assert.equal(perf.cancelledOrders, 1);
  assert.equal(perf.todayProcessedOrders, 1); assert.equal(perf.series.reduce((sum, d) => sum + d.value, 0), 2);
  const other = await readPerformance(p, { _id: b, fullName: "B" }, now);
  assert.equal(other.processedOrders, 1); assert.equal(other.actionCount, 1);
  const overview = await readOverview(p, { _id: a, fullName: "A" }, now);
  assert.equal(overview.backlog.total, 7); assert.equal(overview.backlog.pending, 5); assert.equal(overview.backlog.items.length, 3);
  assert.equal(overview.stock.total, 2); assert.equal(overview.stock.low, 1); assert.equal(overview.stock.out, 1);
  assert.equal(overview.personal.processedOrders, perf.todayProcessedOrders);
  assert.equal(overview.sales.summary.revenue, sales.summary.revenue);
  for (const groupBy of ["week", "month"]) {
    const report = await readSales({ ...p, groupBy }, now);
    assert.equal(report.series.reduce((sum, d) => sum + d.value, 0), 800);
  }
  const empty = await readSales(parseAnalyticsQuery({ dateFrom: "2025-01-01", dateTo: "2025-01-02" }, "sales", now), now);
  assert.equal(empty.summary.revenue, 0); assert.equal(empty.growthPercent, null);
  await Product.deleteMany({});
  assert.equal((await readSales(p, now)).summary.revenue, 800);
  await Order.collection.insertOne(order({ subtotal: 999 }));
  await assert.rejects(readSales(p, now), /Invalid sales snapshots/);
  await Order.collection.deleteOne({ subtotal: 999 });
  const explain = await Order.aggregate(salesPipeline(p)).explain("executionStats");
  assert.ok(explain); console.log("PASS explain collected on small isolated fixture; no index added without representative workload.");
  console.log("PASS sales snapshots/eligibility/boundaries/buckets, multiple payments, personal distinct/actor scope, overview bounds, deleted catalog, corrupt snapshots.");
} catch (error) {
  if (!mongoose.connection.readyState && child) console.error(logs.slice(-1200));
  throw error;
} finally {
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (child && child.exitCode === null) child.kill();
}
