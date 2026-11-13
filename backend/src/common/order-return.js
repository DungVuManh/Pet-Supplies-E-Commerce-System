import mongoose from "mongoose";
import { AppError } from "./errors/app-error.js";
import { resolveCompletedAt } from "./order-auto-complete.js";

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function getReturnCompletionDate(order) {
  if (order.orderStatus !== "completed") return null;
  return order.returnWindowCompletedAt ?? resolveCompletedAt(order);
}

export function getReturnEligibilityError(order, now = new Date(), reason) {
  const status = order.latestReturn?.status ?? order.returnRequest?.status;
  if (status && status !== "cancelled") {
    return new AppError("Đơn hàng đã có yêu cầu hoàn trả.", 409, "DUPLICATE_RETURN_REQUEST");
  }
  if (order.orderStatus === "shipping") return null;
  if (order.orderStatus !== "completed") {
    return new AppError("Chỉ có thể yêu cầu hoàn trả khi đơn đang giao hoặc trong vòng 7 ngày sau khi nhận hàng.", 409, "INVALID_ORDER_STATUS");
  }
  const completedAt = getReturnCompletionDate(order);
  if (!completedAt || now - completedAt > RETURN_WINDOW_MS) {
    return new AppError("Đơn hàng đã quá thời hạn yêu cầu hoàn trả (7 ngày kể từ khi nhận hàng).", 400, "RETURN_PERIOD_EXPIRED");
  }
  if (reason === "not_received") {
    return new AppError("Đơn hàng đã hoàn thành. Vui lòng chọn lý do khác.", 400, "INVALID_RETURN_REASON");
  }
  return null;
}

export async function runReturnTransaction(work) {
  try {
    return await mongoose.connection.transaction(work);
  } catch (error) {
    if (error.code === 20 && /transaction/i.test(error.message)) {
      throw new AppError("Xử lý hoàn đơn cần MongoDB replica set hoặc Atlas.", 503, "TRANSACTIONS_REQUIRED");
    }
    throw error;
  }
}

export function serializeReturnRequest(entry) {
  return {
    requestId: String(entry._id),
    reason: entry.reason,
    description: entry.description,
    bankAccount: entry.bankAccount || null,
    images: entry.images || [],
    status: entry.status,
    refundRequired: Boolean(entry.refundRequired),
    refundStatus: entry.refundStatus || "none",
    refundAmount: entry.refundAmount ?? null,
    requestedAt: entry.requestedAt,
    approvedAt: entry.approvedAt ?? null,
    customerShippedAt: entry.customerShippedAt ?? null,
    receivedAt: entry.receivedAt ?? null,
    completedAt: entry.completedAt ?? null,
    cancelledAt: entry.cancelledAt ?? null,
    reviewedAt: entry.reviewedAt ?? null,
    reviewedByName: entry.reviewedBy?.fullName ?? null,
    rejectionReason: entry.rejectionReason ?? null,
  };
}
