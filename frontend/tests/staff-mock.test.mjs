import assert from "node:assert/strict";
import test from "node:test";
import { availableStock, filterOrders, filterProducts, getOrder, getProduct, performance, revenue, stockStatus } from "../features/staff/mock-data.ts";

test("shared product inventory values remain consistent across staff screens", () => {
  const product = getProduct("RC-D02");
  assert.ok(product);
  assert.equal(product.physical, 72);
  assert.equal(product.reserved, 8);
  assert.equal(availableStock(product), 64);
  assert.equal(stockStatus(product), "available");
  assert.equal(stockStatus(getProduct("KG-B01")), "low");
  assert.equal(stockStatus(getProduct("PL-L01")), "out");
});

test("staff filters match identifiers and Vietnamese names without accents", () => {
  assert.deepEqual(filterOrders("minh anh", "all").map((order) => order.id), ["PA261012018"]);
  assert.deepEqual(filterOrders("PA261012011", "cancelled").map((order) => order.status), ["cancelled"]);
  assert.deepEqual(filterProducts("cat best", "all", "all", "low").map((product) => product.sku), ["CB-L05"]);
  assert.deepEqual(filterProducts("", "Phụ kiện", "hidden", "available").map((product) => product.sku), ["PL-B01"]);
});

test("linked dashboard, reports and detail records share one mock source", () => {
  assert.equal(revenue.at(-1)?.value, 29.2);
  assert.equal(performance.at(-1)?.value, 28);
  const order = getOrder("PA261012018");
  assert.ok(order);
  assert.equal(order.total, 1_100_000);
  assert.deepEqual(order.items.map((item) => item.sku), ["RC-D02", "RC-C02", "KG-B01"]);
});
