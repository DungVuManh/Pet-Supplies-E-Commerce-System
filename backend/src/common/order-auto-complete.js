import { Order } from "../models/order.model.js";

export const AUTO_COMPLETE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
export const COD_AUTO_PAID_AFTER_MS = 4 * 24 * 60 * 60 * 1000;
export const POST_REJECTION_GRACE_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_SWEEP_INTERVAL_MS = 15 * 60 * 1000;
export const DEFAULT_BATCH_SIZE = 100;

function parseValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Resolves when an order entered the `shipping` state using the latest matching
 * `statusHistory` record, falling back to `updatedAt` or `createdAt` for legacy rows.
 */
export function resolveShippingStartedAt(order) {
  if (!order) return null;

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry?.to === "shipping") {
      const shippedDate = parseValidDate(entry.at);
      if (shippedDate) return shippedDate;
    }
  }

  return parseValidDate(order.updatedAt) || parseValidDate(order.createdAt);
}

/**
 * Resolves when an order entered the `completed` state using the latest matching
 * `statusHistory` record, falling back to `updatedAt` or `createdAt` for legacy rows.
 */
export function resolveCompletedAt(order) {
  if (!order) return null;

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry?.to === "completed") {
      const completedDate = parseValidDate(entry.at);
      if (completedDate) return completedDate;
    }
  }

  return parseValidDate(order.updatedAt) || parseValidDate(order.createdAt);
}


/**
 * Checks whether an online order has remained in `shipping` for at least `thresholdMs`
 * (default 72 hours) without customer confirmation or cancellation.
 */
export function isShippingOrderOverdue(
  order,
  now = new Date(),
  thresholdMs = AUTO_COMPLETE_AFTER_MS
) {
  if (!order) return false;
  if (order.channel !== "online") return false;
  if (order.creationState === "pending") return false;
  if (order.orderStatus !== "shipping") return false;

  // Skip orders with active or completed return request
  const nonCompletableReturnStatuses = [
    "pending",
    "approved",
    "customer_shipped",
    "received",
    "completed",
  ];
  if (nonCompletableReturnStatuses.includes(order.returnRequest?.status)) {
    return false;
  }

  const shippedAt = resolveShippingStartedAt(order);
  const current = parseValidDate(now);
  if (!shippedAt || !current) return false;

  if (order.returnRequest?.status === "rejected") {
    const reviewedAt = parseValidDate(order.returnRequest.reviewedAt);
    if (reviewedAt) {
      const graceThreshold = reviewedAt.getTime() + POST_REJECTION_GRACE_MS;
      const normalThreshold = shippedAt.getTime() + thresholdMs;
      const overdueTime = Math.max(graceThreshold, normalThreshold);
      return current.getTime() >= overdueTime;
    }
  }

  return current.getTime() - shippedAt.getTime() >= thresholdMs;
}

/**
 * Atomically transitions all overdue online `shipping` orders to `completed`.
 * ONLINE orders preserve `paymentStatus: "paid"`. COD orders remain `paymentStatus: "unpaid"`
 * until the 4-day COD reconciliation period has elapsed.
 */
export async function autoCompleteOverdueShippingOrders({
  now = new Date(),
  thresholdMs = AUTO_COMPLETE_AFTER_MS,
  batchSize = DEFAULT_BATCH_SIZE,
} = {}) {
  const effectiveNow = parseValidDate(now) || new Date();
  const effectiveThresholdMs =
    Number.isFinite(thresholdMs) && thresholdMs >= 0
      ? thresholdMs
      : AUTO_COMPLETE_AFTER_MS;
  const effectiveBatchSize =
    Number.isInteger(batchSize) && batchSize > 0
      ? batchSize
      : DEFAULT_BATCH_SIZE;

  const cutoff = new Date(effectiveNow.getTime() - effectiveThresholdMs);
  let lastId = null;
  let checkedCount = 0;
  let completedCount = 0;
  let conflictCount = 0;

  while (true) {
    const filter = {
      channel: "online",
      orderStatus: "shipping",
      creationState: { $ne: "pending" },
      createdAt: { $lte: cutoff },
      ...(lastId ? { _id: { $gt: lastId } } : {}),
    };

    const candidates = await Order.find(filter)
      .select(
        "_id orderCode channel orderStatus paymentMethod paymentStatus creationState statusHistory createdAt updatedAt returnRequest"
      )
      .sort({ _id: 1 })
      .limit(effectiveBatchSize)
      .lean();

    if (!Array.isArray(candidates) || candidates.length === 0) {
      break;
    }

    lastId = candidates[candidates.length - 1]._id;

    for (const candidate of candidates) {
      checkedCount += 1;
      if (!isShippingOrderOverdue(candidate, effectiveNow, effectiveThresholdMs)) {
        continue;
      }

      const total = Number.isSafeInteger(candidate.total) ? candidate.total : 0;
      const updateFields = {
        orderStatus: "completed",
        ...(candidate.paymentMethod === "COD" ? { paymentStatus: "paid", paidAmount: total } : {}),
      };

      const result = await Order.updateOne(
        {
          _id: candidate._id,
          channel: "online",
          orderStatus: "shipping",
          paymentStatus: candidate.paymentStatus,
          creationState: { $ne: "pending" },
          "returnRequest.status": {
            $nin: ["pending", "approved", "customer_shipped", "received", "completed"],
          },
        },
        {
          $set: updateFields,
          $push: {
            statusHistory: {
              from: "shipping",
              to: "completed",
              actorType: "system",
              at: effectiveNow,
            },
          },
        },
        { runValidators: true }
      );

      if (result?.modifiedCount === 1) {
        completedCount += 1;
      } else {
        conflictCount += 1;
      }
    }

    if (candidates.length < effectiveBatchSize) {
      break;
    }
  }

  return { checkedCount, completedCount, conflictCount };
}

/**
 * Resolves when an order entered the `completed` state using the latest matching
 * `statusHistory` record, falling back to `updatedAt` or `createdAt` for legacy rows.
 */
export function resolveOrderCompletedAt(order) {
  if (!order) return null;

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry?.to === "completed") {
      const completedDate = parseValidDate(entry.at);
      if (completedDate) return completedDate;
    }
  }

  return parseValidDate(order.updatedAt) || parseValidDate(order.createdAt);
}

/**
 * Checks whether an online COD order has remained in `completed` with unpaid status
 * for at least `thresholdMs` (default 4 days / 96 hours).
 */
export function isCodOrderPaymentOverdue(
  order,
  now = new Date(),
  thresholdMs = COD_AUTO_PAID_AFTER_MS
) {
  if (!order) return false;
  if (order.channel !== "online") return false;
  if (order.creationState === "pending") return false;
  if (order.orderStatus !== "completed") return false;
  if (order.paymentMethod !== "COD") return false;
  if (order.paymentStatus === "paid") return false;

  // Skip orders with pending or approved return request
  if (
    order.returnRequest?.status === "pending" ||
    order.returnRequest?.status === "approved"
  ) {
    return false;
  }

  const completedAt = resolveOrderCompletedAt(order);
  const current = parseValidDate(now);
  if (!completedAt || !current) return false;

  return current.getTime() - completedAt.getTime() >= thresholdMs;
}

/**
 * Atomically transitions all online COD orders completed for at least `thresholdMs`
 * (default 4 days / 96 hours) from `paymentStatus: "unpaid"` to `paymentStatus: "paid"`.
 */
export async function autoPayOverdueCompletedCodOrders({
  now = new Date(),
  thresholdMs = COD_AUTO_PAID_AFTER_MS,
  batchSize = DEFAULT_BATCH_SIZE,
} = {}) {
  const effectiveNow = parseValidDate(now) || new Date();
  const effectiveThresholdMs =
    Number.isFinite(thresholdMs) && thresholdMs >= 0
      ? thresholdMs
      : COD_AUTO_PAID_AFTER_MS;
  const effectiveBatchSize =
    Number.isInteger(batchSize) && batchSize > 0
      ? batchSize
      : DEFAULT_BATCH_SIZE;

  const cutoff = new Date(effectiveNow.getTime() - effectiveThresholdMs);
  let lastId = null;
  let checkedCount = 0;
  let paidCount = 0;
  let conflictCount = 0;

  while (true) {
    const filter = {
      channel: "online",
      orderStatus: "completed",
      paymentMethod: "COD",
      paymentStatus: { $ne: "paid" },
      creationState: { $ne: "pending" },
      createdAt: { $lte: cutoff },
      ...(lastId ? { _id: { $gt: lastId } } : {}),
    };

    const candidates = await Order.find(filter)
      .select(
        "_id orderCode channel orderStatus paymentMethod paymentStatus creationState statusHistory total paidAmount createdAt updatedAt returnRequest"
      )
      .sort({ _id: 1 })
      .limit(effectiveBatchSize)
      .lean();

    if (!Array.isArray(candidates) || candidates.length === 0) {
      break;
    }

    lastId = candidates[candidates.length - 1]._id;

    for (const candidate of candidates) {
      checkedCount += 1;
      if (!isCodOrderPaymentOverdue(candidate, effectiveNow, effectiveThresholdMs)) {
        continue;
      }

      const total = Number.isSafeInteger(candidate.total) ? candidate.total : 0;
      const result = await Order.updateOne(
        {
          _id: candidate._id,
          channel: "online",
          orderStatus: "completed",
          paymentMethod: "COD",
          paymentStatus: candidate.paymentStatus,
          creationState: { $ne: "pending" },
          "returnRequest.status": { $nin: ["pending", "approved"] },
        },
        {
          $set: {
            paymentStatus: "paid",
            paidAmount: total,
          },
        },
        { runValidators: true }
      );

      if (result?.modifiedCount === 1) {
        paidCount += 1;
      } else {
        conflictCount += 1;
      }
    }

    if (candidates.length < effectiveBatchSize) {
      break;
    }
  }

  return { checkedCount, paidCount, conflictCount };
}

/**
 * Starts the non-overlapping periodic scheduler in `server.js`:
 * runs an immediate startup catch-up sweep, then sweeps on `intervalMs`.
 */
export function startOrderAutoCompleteScheduler({
  intervalMs = DEFAULT_SWEEP_INTERVAL_MS,
  batchSize = DEFAULT_BATCH_SIZE,
  onError,
} = {}) {
  const effectiveIntervalMs =
    Number.isInteger(intervalMs) && intervalMs > 0
      ? intervalMs
      : DEFAULT_SWEEP_INTERVAL_MS;

  let stopped = false;
  let inFlight = null;
  let timer = null;

  async function runNow() {
    if (stopped) return null;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const autoCompleteResult = await autoCompleteOverdueShippingOrders({ batchSize });
        const autoPayResult = await autoPayOverdueCompletedCodOrders({ batchSize });
        return { autoCompleteResult, autoPayResult };
      } catch (error) {
        if (typeof onError === "function") {
          onError(error);
        } else {
          console.error("Failed to sweep auto-complete / auto-paid orders", error);
        }
        return null;
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  void runNow();

  timer = setInterval(() => {
    void runNow();
  }, effectiveIntervalMs);
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  async function stop() {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (inFlight) {
      await inFlight;
    }
  }

  return { runNow, stop };
}

