import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getReturnCompletionDate } from "../common/order-return.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { loadEnvironment } from "../config/env.js";
import { Order } from "../models/order.model.js";
import { ReturnRequest } from "../models/return-request.model.js";

export async function migrateOrderReturns() {
  await ReturnRequest.createIndexes();
  const pending = { "returnRequest.status": { $exists: true }, "latestReturn.requestId": { $exists: false } };
  const orders = Order.find(pending).select("_id").lean().cursor();
  let migrated = 0;

  for await (const { _id } of orders) {
    const order = await Order.findOne({ _id, ...pending }).lean();
    if (!order) continue;
    const { returnRequest } = order;
    const entry = {
      ...returnRequest,
      orderId: _id,
      requestedBy: returnRequest.requestedBy ?? order.customerId,
      requestedAt: returnRequest.requestedAt ?? order.updatedAt ?? order.createdAt,
    };
    // The deterministic ID lets a second run finish linking a request that
    // was copied before the first run stopped.
    await ReturnRequest.collection.updateOne({ _id, orderId: _id }, { $setOnInsert: entry }, { upsert: true });
    const saved = await ReturnRequest.findById(_id).lean();
    if (saved?.status !== entry.status) throw new Error("LEGACY_RETURN_STATE_MISMATCH");
    let completedAt = getReturnCompletionDate(order);
    if (completedAt && !order.statusHistory?.some((step) => step.to === "completed" && step.at) &&
        entry.requestedAt < completedAt) {
      completedAt = entry.requestedAt;
    }
    const update = await Order.updateOne({ _id, ...pending, "returnRequest.status": entry.status }, {
      $set: {
        latestReturn: { requestId: _id, status: entry.status, reviewedAt: entry.reviewedAt },
        ...(completedAt ? { returnWindowCompletedAt: completedAt } : {}),
      },
    }, { timestamps: false, runValidators: true });
    migrated += update.modifiedCount;
  }
  const remaining = await Order.countDocuments(pending);
  if (remaining) throw new Error("LEGACY_RETURNS_REMAIN");
  return migrated;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const config = loadEnvironment();
    await connectDatabase(config.MONGODB_URI);
    console.info(`Yêu cầu hoàn trả đã chuyển: ${await migrateOrderReturns()}`);
  } catch (error) {
    const failure = error.code === 11000 ? "Dữ liệu có yêu cầu hoàn trả trùng." :
      error.message === "LEGACY_RETURN_STATE_MISMATCH" ? "Trạng thái yêu cầu đã sao chép khác với đơn gốc." :
      error.message === "LEGACY_RETURNS_REMAIN" ? "Vẫn còn đơn chưa liên kết với yêu cầu đã sao chép." :
      "Kiểm tra cấu hình MongoDB, quyền ghi và kết nối.";
    console.error(`Không thể chuyển dữ liệu hoàn trả. ${failure}`);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
