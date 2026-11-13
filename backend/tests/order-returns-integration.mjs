import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { createModelIndexes } from "../src/config/database.js";
import { Order } from "../src/models/order.model.js";
import { ReturnRequest } from "../src/models/return-request.model.js";
import { Product } from "../src/models/product.model.js";
import { migrateOrderReturns } from "../src/scripts/migrate-order-returns.js";
import { confirmCustomerOrderReceipt } from "../src/controllers/order-status.controller.js";
import {
  cancelCustomerReturn,
  confirmCustomerReturnShipped,
  decideStaffReturn,
  getCustomerReturnDetail,
  getStaffReturnDetail,
  listCustomerReturns,
  listStaffReturns,
  receiveStaffReturn,
  submitCustomerReturnRequest,
} from "../src/controllers/order-return.controller.js";

const uri = process.env.ORDER_RETURNS_TEST_MONGODB_URI;
if (!uri) throw new Error("Set ORDER_RETURNS_TEST_MONGODB_URI to a MongoDB replica set.");
const dbName = `return_test_${randomUUID().replaceAll("-", "")}`;
const id = () => new mongoose.Types.ObjectId();
const customerId = id();
const staffId = id();
const bankAccount = { bankName: "Ngân hàng thử", accountNumber: "12345678", accountHolder: "Nguyễn Văn A" };
const proof = "https://res.cloudinary.com/test/image/upload/proof.png";
const payload = {
  reason: "damaged_or_missing", description: "Nội dung ban đầu của khách hàng", images: [proof], bankAccount,
};
const day = 24 * 60 * 60 * 1000;

async function call(handler, orderOrRequestId, body = {}, userId = customerId, params = {}, query = {}) {
  let data;
  await handler({ params: { id: String(orderOrRequestId), ...params }, body, query, user: { _id: userId } }, {
    status() { return this; },
    json(result) { data = result.data; },
  });
  return data;
}

async function insertOrder(fields = {}) {
  const _id = id();
  const now = new Date();
  await Order.collection.insertOne({
    _id, orderCode: `TEST-${_id}`, channel: "online", customerId, items: [], orderStatus: "shipping",
    subtotal: 100000, total: 100000, paymentMethod: "ONLINE", paymentStatus: "paid", createdAt: now, updatedAt: now,
    ...fields,
  });
  return _id;
}

async function sendReturn(orderId, data = payload) {
  return (await call(submitCustomerReturnRequest, orderId, data)).returnRequest;
}

async function staffDecision(requestId, action, fields = {}) {
  return call(decideStaffReturn, requestId, { action, ...fields }, staffId);
}

await mongoose.connect(uri, { dbName, autoIndex: false });
try {
  await createModelIndexes();
  const migrationOrder = await insertOrder({ returnRequest: {
    ...payload, status: "pending", requestedBy: customerId, requestedAt: new Date(),
  } });
  assert.equal(await migrateOrderReturns(), 1);
  assert.equal(await migrateOrderReturns(), 0);
  assert.equal((await call(getStaffReturnDetail, migrationOrder, {}, staffId)).id, String(migrationOrder));

  const orderId = await insertOrder();
  const first = await sendReturn(orderId);
  await assert.rejects(call(cancelCustomerReturn, orderId, first, id()), { code: "ORDER_NOT_FOUND" });
  await assert.rejects(call(getCustomerReturnDetail, orderId, {}, id(), { requestId: first.requestId }), { code: "ORDER_NOT_FOUND" });
  const cancelled = (await call(cancelCustomerReturn, orderId, first)).returnRequest;
  assert.equal(cancelled.status, "cancelled");
  assert.ok(cancelled.cancelledAt);
  const orderAfterCancel = await Order.findById(orderId).lean();
  assert.equal(orderAfterCancel.orderStatus, "shipping");
  assert.equal(orderAfterCancel.paymentStatus, "paid");

  const submissions = await Promise.allSettled([
    sendReturn(orderId, { ...payload, description: "Nội dung của lần gửi tiếp theo" }),
    sendReturn(orderId, { ...payload, description: "Nội dung của lần gửi tiếp theo" }),
  ]);
  assert.equal(submissions.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(submissions.find(({ status }) => status === "rejected").reason.statusCode, 409);
  const current = submissions.find(({ status }) => status === "fulfilled").value;
  assert.notEqual(current.requestId, first.requestId);
  assert.deepEqual((await call(cancelCustomerReturn, orderId, first)).returnRequest, cancelled);
  await assert.rejects(staffDecision(first.requestId, "approve_request"), { code: "RETURN_CONFLICT" });
  await assert.rejects(call(confirmCustomerReturnShipped, orderId, first), { code: "RETURN_CONFLICT" });
  const oldDetail = await call(getStaffReturnDetail, first.requestId, {}, staffId);
  assert.equal(oldDetail.returnRequest.description, payload.description);
  assert.deepEqual(oldDetail.returnRequest.images, [proof]);
  assert.deepEqual(oldDetail.returnRequest.bankAccount, bankAccount);
  assert.deepEqual((await call(getCustomerReturnDetail, orderId, {}, customerId, { requestId: first.requestId })).returnRequest.images, [proof]);
  const history = await call(listCustomerReturns, orderId);
  assert.deepEqual(history.items.map(({ requestId }) => requestId), [current.requestId, first.requestId]);
  const staffHistory = await call(listStaffReturns, null, {}, staffId, {}, { status: "cancelled" });
  assert.deepEqual(staffHistory.items.map(({ id }) => id), [first.requestId]);

  await staffDecision(current.requestId, "approve_request");
  const race = await Promise.allSettled([
    call(cancelCustomerReturn, orderId, current), call(confirmCustomerReturnShipped, orderId, current),
  ]);
  assert.equal(race.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(race.find(({ status }) => status === "rejected").reason.code, "RETURN_CONFLICT");
  const final = await ReturnRequest.findById(current.requestId).lean();
  assert.equal((await Order.findById(orderId).lean()).latestReturn.status, final.status);

  const productId = id();
  await Product.collection.insertOne({ _id: productId, variants: [{ sku: "RETURN-TEST-1", stock: 5 }] });
  const fulfillOrder = await insertOrder({ items: [{ productId, variantSku: "RETURN-TEST-1", qty: 2 }] });
  const fulfill = await sendReturn(fulfillOrder);
  await staffDecision(fulfill.requestId, "approve_request");
  await call(confirmCustomerReturnShipped, fulfillOrder, fulfill);
  await assert.rejects(call(cancelCustomerReturn, fulfillOrder, fulfill), { code: "RETURN_CONFLICT" });
  await call(receiveStaffReturn, fulfill.requestId, {}, staffId);
  await staffDecision(fulfill.requestId, "complete_refund", { refundAmount: 85000 });
  await assert.rejects(staffDecision(fulfill.requestId, "complete_refund"), { code: "RETURN_CONFLICT" });
  assert.equal((await Order.findById(fulfillOrder).lean()).orderStatus, "returned");
  assert.equal((await Product.findById(productId).lean()).variants[0].stock, 7);

  const receiptOrder = await insertOrder();
  const receiptReturn = await sendReturn(receiptOrder);
  await staffDecision(receiptReturn.requestId, "approve_request");
  await call(cancelCustomerReturn, receiptOrder, receiptReturn);
  await call(confirmCustomerOrderReceipt, receiptOrder);
  const next = await sendReturn(receiptOrder);
  assert.equal(next.status, "pending");
  await call(cancelCustomerReturn, receiptOrder, next);
  await Order.collection.updateOne({ _id: receiptOrder }, { $set: { returnWindowCompletedAt: new Date(Date.now() - 8 * day) } });
  await assert.rejects(sendReturn(receiptOrder), { code: "RETURN_PERIOD_EXPIRED" });

  console.info("Order returns migration, history, authorization, concurrency, expiry, and full lifecycle passed.");
} finally {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
