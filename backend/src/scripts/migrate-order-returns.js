import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getReturnCompletionDate, runReturnTransaction } from "../common/order-return.js";
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
    migrated += await runReturnTransaction(async (session) => {
      const order = await Order.findOne({ _id, ...pending }).session(session).lean();
      if (!order) return 0;
      const { returnRequest } = order;
      const entry = {
        ...returnRequest,
        _id,
        orderId: _id,
        requestedBy: returnRequest.requestedBy ?? order.customerId,
        requestedAt: returnRequest.requestedAt ?? order.updatedAt ?? order.createdAt,
      };
      // Import historical rows as stored, including older field shapes.
      await ReturnRequest.collection.insertOne(entry, { session });
      let completedAt = getReturnCompletionDate(order);
      if (completedAt && !order.statusHistory?.some((step) => step.to === "completed" && step.at) &&
          entry.requestedAt < completedAt) {
        completedAt = entry.requestedAt;
      }
      const update = await Order.updateOne({ _id, ...pending }, {
        $set: {
          latestReturn: { requestId: _id, status: entry.status, reviewedAt: entry.reviewedAt },
          ...(completedAt ? { returnWindowCompletedAt: completedAt } : {}),
        },
      }, { session, timestamps: false, runValidators: true });
      if (update.modifiedCount !== 1) throw new Error("Legacy return changed during migration");
      return 1;
    });
  }
  const remaining = await Order.countDocuments(pending);
  if (remaining) throw new Error("Some legacy returns remain unmigrated");
  return migrated;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const config = loadEnvironment();
    await connectDatabase(config.MONGODB_URI);
    console.info(`Yêu cầu hoàn trả đã chuyển: ${await migrateOrderReturns()}`);
  } catch {
    console.error("Không thể chuyển dữ liệu hoàn trả. Kiểm tra kết nối replica set và dữ liệu trước khi chạy lại.");
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
