// Real MongoDB race checks the in-memory test doubles cannot prove. Uses a throwaway
// database, dropped at the end. Run: node tests/voucher-integration.mjs
// VOUCHER_TEST_MONGODB_URI defaults to the local server. No .env or Firebase is needed.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { reserveVoucher } from "../src/common/voucher-redemption.js";
import { createModelIndexes } from "../src/config/database.js";
import { parseEnvironment } from "../src/config/env.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { PromotionRedemption } from "../src/models/promotion-redemption.model.js";
import { Promotion } from "../src/models/promotion.model.js";

const uri = process.env.VOUCHER_TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const databaseName = `petly_voucher_test_${randomUUID().replaceAll("-", "")}`;
const DAY = 24 * 60 * 60 * 1000;
const CONCURRENT = 20;

await mongoose.connect(uri, { dbName: databaseName, autoIndex: false });
assert.equal(mongoose.connection.db.databaseName, databaseName);
const server = createApp(parseEnvironment({ NODE_ENV: "test" })).listen(0);

try {
 await createModelIndexes();
 const productId = new mongoose.Types.ObjectId();
 await Product.collection.insertOne({ _id: productId, name: "Fixture", price: 100000, isActive: true, variants: [{ sku: "SKU-1", price: 100000, stock: 100000 }] });

 const voucherFields = (code, patch = {}) => ({
  code, name: code, type: "fixed", value: 10000, minOrderAmount: 0, isActive: true, oncePerCustomer: false, usedCount: 0,
  startAt: new Date(Date.now() - DAY), endAt: new Date(Date.now() + DAY), ...patch,
 });
 const phoneFor = (index) => `09${String(10000000 + index)}`;
 const place = (code, phone, patch = {}) => request(server).post("/api/v1/orders").send({
  items: [{ productId: String(productId), variantSku: "SKU-1", qty: 1 }],
  guestInfo: { name: "Fixture", phone },
  shippingAddress: { recipientName: "Fixture", phone, province: "HN", district: "CG", ward: "DV", street: "1" },
  promotionCode: code, expectedDiscount: 10000, ...patch,
 });
 const count = async (responses, status) => responses.filter((response) => response.status === status).length;
 const race = (code, phones) => Promise.all(phones.map((phone) => place(code, phone)));
 const everyone = Array.from({ length: CONCURRENT }, (_, index) => phoneFor(index));

 const report = async (code, responses, expected) => {
  const voucher = await Promotion.findOne({ code }).lean();
  const created = await count(responses, 201);
  const refused = await count(responses, 409);
  const discounted = await Order.countDocuments({ promotionCode: code, discount: 10000, total: 90000 });
  const active = await PromotionRedemption.countDocuments({ code, status: "active" });
  console.log(`${code}: ${created} created, ${refused} refused, ${discounted} discounted orders, usedCount ${voucher.usedCount}, ${active} active redemptions`);
  assert.equal(created, expected.created, `${code} created`);
  assert.equal(refused, CONCURRENT - expected.created, `${code} refused`);
  assert.equal(discounted, expected.created, `${code} orders`);
  assert.equal(voucher.usedCount, expected.used, `${code} usedCount`);
  assert.equal(active, expected.created, `${code} redemptions`);
 };

 // 1. One use left, 20 customers at once.
 await Promotion.create(voucherFields("ONE-LEFT", { usageLimit: 5, usedCount: 4 }));
 await report("ONE-LEFT", await race("ONE-LEFT", everyone), { created: 1, used: 5 });

 // 2. A document from before usage counting has no `usedCount`.
 await Promotion.collection.insertOne({ ...voucherFields("LEGACY", { usageLimit: 1 }), usedCount: undefined, createdAt: new Date(), updatedAt: new Date() });
 await Promotion.collection.updateOne({ code: "LEGACY" }, { $unset: { usedCount: 1 } });
 await report("LEGACY", await race("LEGACY", everyone), { created: 1, used: 1 });

 // 3. Once per customer: one guest, 20 orders at once, in different spellings of one phone.
 await Promotion.create(voucherFields("ONCE", { oncePerCustomer: true }));
 const spellings = Array.from({ length: CONCURRENT }, (_, index) => (index % 2 ? "0912345678" : "+84912345678"));
 await report("ONCE", await race("ONCE", spellings), { created: 1, used: 1 });

 // 4. Cancelling twice, even at once, returns the use exactly once; it can then be redeemed again.
 const [order] = await Order.find({ promotionCode: "ONCE" }).lean();
 const updatedAt = (await Promotion.findOne({ code: "ONCE" }).lean()).updatedAt;
 await Promise.all(Array.from({ length: 5 }, () => request(server).patch(`/api/v1/orders/${order._id}/cancel`).send({})));
 const released = await Promotion.findOne({ code: "ONCE" }).lean();
 console.log(`ONCE after 5 concurrent cancels: usedCount ${released.usedCount}`);
 assert.equal(released.usedCount, 0);
 assert.equal(await PromotionRedemption.countDocuments({ code: "ONCE", status: "released" }), 1);
 assert.equal((await place("ONCE", "0912345678")).status, 201);
 assert.equal((await Promotion.findOne({ code: "ONCE" }).lean()).usedCount, 1);

 // 5. Sales do not make an Admin's open edit form stale.
 assert.equal((await Promotion.findOne({ code: "ONCE" }).lean()).updatedAt.getTime(), updatedAt.getTime());

 // 6. An order the database refuses gives everything back. A guest with no name fails the Order validator.
 await Promotion.create(voucherFields("FAILS", { usageLimit: 1 }));
 const failed = await place("FAILS", "0912000000", { guestInfo: { phone: "0912000000" } });
 assert.notEqual(failed.status, 201);
 const restored = await Promotion.findOne({ code: "FAILS" }).lean();
 console.log(`FAILS after a refused order (${failed.status}): usedCount ${restored.usedCount}`);
 assert.equal(restored.usedCount, 0);
 assert.equal(await PromotionRedemption.countDocuments({ code: "FAILS" }), 0);

 // 7. An Admin edit between reading and reserving refuses the reservation.
 const stale = await Promotion.findOne({ code: "FAILS" }).lean();
 await Promotion.updateOne({ code: "FAILS" }, { $set: { name: "Edited" } });
 const refused = await reserveVoucher({ voucher: stale, discount: 10000, customer: { phone: "0912000001" }, orderId: new mongoose.Types.ObjectId() });
 assert.deepEqual(refused, { reserved: false, reason: "unavailable" });

 console.log("voucher integration: all passed");
} finally {
 await new Promise((resolve) => server.close(resolve));
 await mongoose.connection.db.dropDatabase();
 await mongoose.disconnect();
}
