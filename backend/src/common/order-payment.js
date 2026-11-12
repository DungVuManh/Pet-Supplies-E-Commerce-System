import { AppError } from "./errors/app-error.js";
import { Setting } from "../models/setting.model.js";
import {
  formatTransferMemo,
  generateVietQrPayload,
  generateVietQrUrl,
} from "./sepay-service.js";

const PAYMENT_SESSION_DURATION_MS = 15 * 60 * 1000;

export async function getEffectiveBankConfig(config) {
  let setting = null;
  try {
    setting = await Setting.findOne({ _id: "global" }).lean();
  } catch {
    // Fallback sang biến môi trường nếu chưa đọc được Setting.
  }

  return {
    bankCode:
      setting?.bankCode ||
      config?.SEPAY_BANK_CODE ||
      process.env.SEPAY_BANK_CODE ||
      "MB",
    accountNumber:
      setting?.accountNumber ||
      config?.SEPAY_ACCOUNT_NUMBER ||
      process.env.SEPAY_ACCOUNT_NUMBER ||
      "",
    accountHolder:
      setting?.accountHolder ||
      config?.SEPAY_ACCOUNT_HOLDER ||
      process.env.SEPAY_ACCOUNT_HOLDER ||
      "PETJOY STORE",
  };
}

export function canResumeOnlinePayment(order) {
  if (!order || order.creationState === "pending") return false;
  if (order.channel === "offline") return false;
  if (order.paymentMethod !== "ONLINE") return false;
  if (order.paymentStatus === "paid") return false;
  if (order.orderStatus === "cancelled") return false;
  return true;
}

export function computeOrderPaymentAmounts(order) {
  const total = Number.isSafeInteger(order?.total) ? order.total : 0;
  const rawPaid = Number.isSafeInteger(order?.paidAmount) ? order.paidAmount : 0;
  const paidAmount =
    rawPaid > 0 ? rawPaid : order?.paymentStatus === "paid" ? total : 0;
  const remainingAmount =
    order?.paymentStatus === "paid" ? 0 : Math.max(0, total - paidAmount);

  return { total, paidAmount, remainingAmount };
}

export function computePaymentExpiry(order, now = new Date()) {
  const baseDate = order?.createdAt ? new Date(order.createdAt) : now;
  const expiredAt = order?.paymentExpiredAt
    ? new Date(order.paymentExpiredAt)
    : new Date(baseDate.getTime() + PAYMENT_SESSION_DURATION_MS);

  const secondsLeft = Math.max(
    0,
    Math.floor((expiredAt.getTime() - now.getTime()) / 1000)
  );
  const isPaid = order?.paymentStatus === "paid";
  const isExpired = secondsLeft === 0 && !isPaid;

  return { expiredAt, secondsLeft, isExpired, isPaid };
}

export function getOnlinePaymentIneligibilityError(order) {
  if (!order || order.creationState === "pending") {
    return new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  }
  if (order.orderStatus === "cancelled") {
    return new AppError(
      "Đơn hàng đã bị hủy, không thể tiếp tục thanh toán.",
      409,
      "ORDER_CANCELLED"
    );
  }
  if (order.paymentStatus === "paid") {
    return new AppError(
      "Đơn hàng này đã được thanh toán.",
      409,
      "ORDER_ALREADY_PAID"
    );
  }
  if (order.channel === "offline") {
    return new AppError(
      "Đơn hàng tại quầy không hỗ trợ thanh toán trực tuyến.",
      409,
      "OFFLINE_ORDER"
    );
  }
  if (order.paymentMethod !== "ONLINE") {
    return new AppError(
      "Đơn hàng không sử dụng phương thức thanh toán trực tuyến (ONLINE).",
      409,
      "PAYMENT_METHOD_NOT_ONLINE"
    );
  }
  return null;
}

export function buildVietQrInfo(order, bankConfig, now = new Date()) {
  const { total, paidAmount, remainingAmount } = computeOrderPaymentAmounts(order);
  const { expiredAt, secondsLeft, isExpired, isPaid } = computePaymentExpiry(
    order,
    now
  );
  const memo = formatTransferMemo(order.orderCode);
  const transferAmount = remainingAmount > 0 ? remainingAmount : total;

  return {
    orderCode: order.orderCode,
    total,
    paidAmount,
    remainingAmount,
    bankCode: bankConfig.bankCode,
    accountNumber: bankConfig.accountNumber,
    accountHolder: bankConfig.accountHolder,
    memo,
    qrUrl: generateVietQrUrl({
      bankCode: bankConfig.bankCode,
      accountNumber: bankConfig.accountNumber,
      amount: transferAmount,
      memo,
      accountHolder: bankConfig.accountHolder,
    }),
    qrPayload: generateVietQrPayload({
      bankCode: bankConfig.bankCode,
      accountNumber: bankConfig.accountNumber,
      amount: transferAmount,
      memo,
    }),
    paymentExpiredAt: expiredAt.toISOString(),
    secondsLeft,
    isExpired,
    isPaid,
  };
}

export function buildCustomerOrderPaymentSession(order, bankConfig, now = new Date()) {
  const { total, paidAmount, remainingAmount } = computeOrderPaymentAmounts(order);

  let state = "eligible";
  let message = null;
  if (order.orderStatus === "cancelled") {
    state = "cancelled";
    message = "Đơn hàng đã bị hủy nên không thể tiếp tục thanh toán.";
  } else if (order.paymentStatus === "paid") {
    state = "already_paid";
    message = "Đơn hàng này đã được thanh toán hoàn tất.";
  } else if (order.channel === "offline" || order.paymentMethod !== "ONLINE") {
    state = "not_online";
    message =
      order.paymentMethod === "COD"
        ? "Đơn hàng này đang sử dụng hình thức thanh toán khi nhận hàng (COD)."
        : "Đơn hàng này không sử dụng hình thức thanh toán chuyển khoản trực tuyến.";
  }

  const eligible = state === "eligible";

  return {
    orderId: String(order._id),
    orderCode: order.orderCode,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total,
    paidAmount,
    remainingAmount,
    needsReview: Boolean(order.needsReview),
    eligible,
    state,
    message,
    paymentInfo: eligible ? buildVietQrInfo(order, bankConfig, now) : null,
  };
}

