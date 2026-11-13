import mongoose from "mongoose";
import { AuditLog } from "../models/audit-log.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ReturnRequest } from "../models/return-request.model.js";
import { AppError } from "./errors/app-error.js";
import { returnConflict } from "./order-return.js";

const writeOptions = { timestamps: false, runValidators: true };

export async function loadOrderForReturn(filter) {
  let order = await Order.findOne(filter).select("+returnOperation").lean();
  while (order?.returnOperation) {
    await finishReturnOperation(order);
    order = await Order.findOne(filter).select("+returnOperation").lean();
  }
  return order;
}

export async function applyReturnOperation(order, { requestId, fromStatus, fields, orderFields, orderHistory, audit }, initialFields = {}) {
  const operation = { id: new mongoose.Types.ObjectId(), requestId, fromStatus, fields, orderFields, orderHistory, audit };
  const reserved = await Order.updateOne({
    _id: order._id,
    orderStatus: order.orderStatus,
    returnOperation: { $exists: false },
    "latestReturn.requestId": order.latestReturn?.requestId ?? { $exists: false },
    "latestReturn.status": order.latestReturn?.status ?? { $exists: false },
  }, { $set: { returnOperation: operation, ...initialFields } }, writeOptions);
  if (reserved.modifiedCount !== 1) throw returnConflict();
  try {
    return await finishReturnOperation({ ...order, returnOperation: operation });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Return operation needs recovery", { orderId: String(order._id) });
    throw new AppError("Yêu cầu đã được ghi nhận và đang đồng bộ. Hãy tải lại để kiểm tra kết quả.", 503, "RETURN_SYNC_PENDING");
  }
}

async function restockOrder(order, requestId) {
  const items = new Map();
  for (const { productId, variantSku, qty } of order.items ?? []) {
    if (!productId || !variantSku || qty <= 0) continue;
    const key = `${productId}:${variantSku}`;
    const item = items.get(key) ?? { productId, variantSku, qty: 0 };
    item.qty += qty;
    items.set(key, item);
  }
  for (const { productId, variantSku, qty } of items.values()) {
    const key = `${requestId}:${variantSku}`;
    // The marker and increment share one product write. Retrying after an
    // interrupted or unacknowledged write cannot increment this SKU twice.
    await Product.updateOne({
      _id: productId, "variants.sku": variantSku, returnRestockKeys: { $ne: key },
    }, { $inc: { "variants.$.stock": qty }, $addToSet: { returnRestockKeys: key } });
  }
}

async function finishReturnOperation(order) {
  const { id, requestId, fromStatus, fields, orderFields, orderHistory, audit } = order.returnOperation;
  const requestFilter = { _id: requestId, orderId: order._id };
  if (orderFields) await restockOrder(order, requestId);

  if (fromStatus) {
    await ReturnRequest.updateOne({ ...requestFilter, status: fromStatus }, {
      $set: { ...fields, lastOperationId: id },
    }, { runValidators: true });
  } else {
    try {
      await ReturnRequest.updateOne(requestFilter, {
        $setOnInsert: { ...fields, lastOperationId: id },
      }, { upsert: true, runValidators: true, timestamps: false });
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Another worker may have inserted the same request while recovering it.
    }
  }
  const entry = await ReturnRequest.findOne(requestFilter).select("+lastOperationId").lean();
  if (String(entry?.lastOperationId) !== String(id)) {
    throw returnConflict();
  }

  if (audit) {
    try {
      await AuditLog.updateOne({ _id: id }, { $setOnInsert: audit }, { upsert: true, timestamps: false, runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  // Release the guard only after all other writes have succeeded. A stale worker
  // cannot publish this transition or append its order history a second time.
  await Order.updateOne({ _id: order._id, "returnOperation.id": id }, {
    $set: {
      ...orderFields,
      latestReturn: { requestId, status: fields.status, reviewedAt: fields.reviewedAt ?? order.latestReturn?.reviewedAt },
    },
    $unset: { returnOperation: 1 },
    ...(orderHistory ? { $push: { statusHistory: orderHistory } } : {}),
  }, { ...writeOptions, timestamps: Boolean(orderFields) });
  return entry;
}

export async function recoverReturnOperations() {
  const orders = Order.find({ "returnOperation.id": { $exists: true } }).select("+returnOperation").lean().cursor();
  for await (const order of orders) {
    try {
      await finishReturnOperation(order);
    } catch (error) {
      if (error.code !== "RETURN_CONFLICT") console.error("Could not resume return operation", { orderId: String(order._id) });
    }
  }
}
