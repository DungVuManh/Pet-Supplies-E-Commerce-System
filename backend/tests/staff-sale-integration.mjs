// Optional isolated MongoDB integration: no .env, Firebase, or application database.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { createStaffSale, listSaleProducts, listSaleCustomers } from "../src/controllers/staff-sale.controller.js";
import { createModelIndexes } from "../src/config/database.js";
import { Product } from "../src/models/product.model.js";
import { Order } from "../src/models/order.model.js";
import { User } from "../src/models/user.model.js";
import { Payment } from "../src/models/payment.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";

const require = createRequire(import.meta.url);
const { MongoMemoryReplSet } = require(process.env.MONGODB_MEMORY_MODULE_PATH || "mongodb-memory-server-core");
const replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" },
 binary: { version: "8.0.17" } });
try {
 await mongoose.connect(replica.getUri("petly_sale_test"), { autoIndex: false });
 await createModelIndexes();
 const actor = await User.create({ firebaseUid: "fixture-staff", role: "staff", fullName: "Staff fixture",
  phone: "0912345678", email: "staff@example.test", termsAcceptedAt: new Date() });
 const customer = await User.create({ firebaseUid: "fixture-customer", role: "customer", fullName: "Customer fixture",
  phone: "0912345678", email: "customer@example.test", termsAcceptedAt: new Date() });
 const product = await Product.create({ name: "Product fixture", petType: "cat", categoryId: new mongoose.Types.ObjectId(),
  variants: [{ sku: "SKU-1", label: "1 kg", price: 10000, stock: 10, reservedStock: 2 }] });
 const payload = { customer: { name: "Guest fixture", phone: "0912345678" },
  items: [{ sku: "SKU-1", qty: 2, expectedPrice: 10000 }], cashReceived: true };
 async function create(body = payload, key = randomUUID()) {
  let status = 200, result;
  await createStaffSale({ body, user: actor, get: () => key }, {
   status(code) { status = code; return this; }, json(value) { result = value; return this; },
  });
  return { status, ...result };
 }
 const repeatedKey = randomUUID();
 const repeats = await Promise.all(Array.from({ length: 5 }, () => create(payload, repeatedKey)));
 assert.equal(new Set(repeats.map((v) => v.data.order.id)).size, 1);
 assert.equal(await Order.countDocuments(), 1);
 assert.equal(await Payment.countDocuments(), 1);
 assert.equal(await AuditLog.countDocuments(), 1);
 assert.equal((await Product.findById(product._id)).variants[0].stock, 8);
 assert.equal(repeats.filter((v) => v.status === 201).length, 1);
 await assert.rejects(create({ ...payload, items: [{ ...payload.items[0], qty: 1 }] }, repeatedKey), (error) => error.code === "IDEMPOTENCY_CONFLICT");
 console.log("PASS concurrent replay: one order/payment/audit and one stock deduction");

 const attempts = await Promise.allSettled(Array.from({ length: 5 }, () => create({
  customerId: String(customer._id), items: payload.items, cashReceived: true,
 })));
 assert.equal(attempts.filter((v) => v.status === "fulfilled").length, 3);
 assert.equal(attempts.filter((v) => v.status === "rejected" && v.reason.code === "OUT_OF_STOCK").length, 2);
 const persisted = await Product.findById(product._id);
 assert.equal(persisted.variants[0].stock, 2);
 assert.equal(persisted.variants[0].reservedStock, 2);
 assert.equal(await Order.countDocuments(), 4);
 assert.equal(await Payment.countDocuments(), 4);
 assert.equal(await AuditLog.countDocuments(), 4);
 console.log("PASS concurrent distinct sales: reserved stock preserved, no oversell");

 await Product.updateOne({ _id: product._id }, { $set: { "variants.0.stock": 10 } });
 const save = AuditLog.prototype.save;
 AuditLog.prototype.save = async function () { throw new Error("test audit write failure"); };
 try { await assert.rejects(create(), (error) => error.code === "ORDERS_UNAVAILABLE"); }
 finally { AuditLog.prototype.save = save; }
 assert.equal((await Product.findById(product._id)).variants[0].stock, 10);
 assert.equal(await Order.countDocuments(), 4);
 assert.equal(await Payment.countDocuments(), 4);
 assert.equal(await AuditLog.countDocuments(), 4);
 console.log("PASS real transaction rollback after Order/Payment writes");

 await Product.create({ name: "Hidden fixture", petType: "cat", isActive: false, categoryId: new mongoose.Types.ObjectId(),
  variants: [{ sku: "HIDDEN", label: "1 kg", price: 1, stock: 10 }] });
 await Product.create({ name: "Reserved fixture", petType: "cat", categoryId: new mongoose.Types.ObjectId(),
  variants: [{ sku: "RESERVED", label: "1 kg", price: 1, stock: 3, reservedStock: 3 }] });
 async function lookup(handler, query) {
  let result; await handler({ query }, { json(value) { result = value.data; } }); return result;
 }
 const sellable = await lookup(listSaleProducts, {});
 assert.deepEqual(sellable.items.map((item) => item.sku), ["SKU-1"]);
 assert.equal((await lookup(listSaleProducts, { query: ".*" })).items.length, 0);
 const customers = await lookup(listSaleCustomers, { query: "fixture" });
 assert.deepEqual(customers.items.map((item) => item.id), [String(customer._id)]);
 await Product.create({ name: "Page fixture", petType: "cat", categoryId: new mongoose.Types.ObjectId(),
  variants: Array.from({ length: 15 }, (_, i) => ({ sku: `PAGE-${String(i).padStart(2, "0")}`, label: "1 kg", price: 1, stock: 1 })) });
 const firstPage = await lookup(listSaleProducts, { query: "Page", page: "1" });
 const secondPage = await lookup(listSaleProducts, { query: "Page", page: "2" });
 assert.equal(firstPage.items.length, 10); assert.equal(firstPage.hasMore, true);
 assert.equal(secondPage.items.length, 5); assert.equal(secondPage.hasMore, false);
 assert.equal(new Set([...firstPage.items, ...secondPage.items].map((item) => item.sku)).size, 15);
 console.log("PASS real lookup pipelines: sellable variants, literal search, Customer isolation and paging after unwind");
} finally {
 await mongoose.disconnect();
 await replica.stop();
}
