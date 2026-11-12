import { AppError } from "../common/errors/app-error.js";
import {
  buildCustomerOrderPaymentSession,
  computeOrderPaymentAmounts,
  getEffectiveBankConfig,
  getOnlinePaymentIneligibilityError,
} from "../common/order-payment.js";
import { Order } from "../models/order.model.js";
import { parseOrderId } from "../validators/order.validator.js";

const PAYMENT_CONFLICT_ERROR_CODES = new Set([
  "ORDER_CANCELLED",
  "ORDER_ALREADY_PAID",
  "OFFLINE_ORDER",
  "PAYMENT_METHOD_NOT_ONLINE",
]);

async function loadCustomerOrder(id, customerId) {
  let order;
  try {
    order = await Order.findOne({
      _id: id,
      customerId,
      creationState: { $ne: "pending" },
    }).lean();
  } catch {
    throw new AppError(
      "Chưa thể tải thông tin thanh toán của đơn hàng. Vui lòng thử lại.",
      503,
      "ORDERS_UNAVAILABLE"
    );
  }

  if (!order) {
    throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  }
  return order;
}

async function resolveAtomicPaymentConflict(id, customerId) {
  const latest = await Order.findOne({
    _id: id,
    customerId,
    creationState: { $ne: "pending" },
  })
    .lean()
    .catch(() => null);

  if (!latest) {
    return new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  }
  const ineligibility = getOnlinePaymentIneligibilityError(latest);
  if (ineligibility) {
    return ineligibility;
  }
  return new AppError(
    "Trạng thái đơn hàng đã thay đổi. Vui lòng tải lại trang.",
    409,
    "ORDER_STATUS_CONFLICT"
  );
}

/**
 * GET /api/v1/orders/:id/payment
 * Trả về trạng thái hợp lệ và phiên thanh toán VietQR cho chủ sở hữu đơn hàng.
 */
export async function getCustomerOrderPayment(request, response) {
  const id = parseOrderId(request.params);
  const order = await loadCustomerOrder(id, request.user._id);
  const bankConfig = await getEffectiveBankConfig(request.app?.locals?.config);
  const session = buildCustomerOrderPaymentSession(order, bankConfig);

  response.set("Cache-Control", "no-store");
  response.json({
    success: true,
    data: { session },
  });
}

/**
 * POST /api/v1/orders/:id/payment/renew
 * Gia hạn phiên thanh toán VietQR thêm 15 phút bằng cập nhật nguyên tử có điều kiện.
 */
export async function renewCustomerOrderPayment(request, response) {
  const id = parseOrderId(request.params);
  const order = await loadCustomerOrder(id, request.user._id);
  const ineligibility = getOnlinePaymentIneligibilityError(order);
  if (ineligibility) {
    throw ineligibility;
  }

  const newExpiredAt = new Date(Date.now() + 15 * 60 * 1000);
  let result;
  try {
    result = await Order.updateOne(
      {
        _id: id,
        customerId: request.user._id,
        channel: "online",
        paymentMethod: "ONLINE",
        paymentStatus: { $ne: "paid" },
        orderStatus: { $ne: "cancelled" },
        creationState: { $ne: "pending" },
      },
      { $set: { paymentExpiredAt: newExpiredAt } },
      { runValidators: true }
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Chưa thể gia hạn phiên thanh toán. Vui lòng thử lại.",
      503,
      "ORDERS_UNAVAILABLE"
    );
  }

  if (result.modifiedCount !== 1) {
    throw await resolveAtomicPaymentConflict(id, request.user._id);
  }

  response.set("Cache-Control", "no-store");
  response.json({
    success: true,
    message: "Đã gia hạn phiên thanh toán thêm 15 phút.",
    data: {
      orderId: id,
      orderCode: order.orderCode,
      paymentExpiredAt: newExpiredAt.toISOString(),
      secondsLeft: 900,
    },
  });
}

/**
 * POST /api/v1/orders/:id/payment/convert-to-cod
 * Chuyển đổi đơn hàng ONLINE sang COD bằng cập nhật nguyên tử có điều kiện.
 */
export async function convertCustomerOrderToCod(request, response) {
  const id = parseOrderId(request.params);
  const order = await loadCustomerOrder(id, request.user._id);
  const ineligibility = getOnlinePaymentIneligibilityError(order);
  if (ineligibility) {
    throw ineligibility;
  }

  const { paidAmount } = computeOrderPaymentAmounts(order);
  const updateFields = {
    paymentMethod: "COD",
    paymentStatus: "unpaid",
    ...(paidAmount > 0 ? { needsReview: true } : {}),
  };

  let result;
  try {
    result = await Order.updateOne(
      {
        _id: id,
        customerId: request.user._id,
        channel: "online",
        paymentMethod: "ONLINE",
        paymentStatus: { $ne: "paid" },
        orderStatus: { $ne: "cancelled" },
        creationState: { $ne: "pending" },
      },
      { $set: updateFields },
      { runValidators: true }
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Chưa thể chuyển sang hình thức COD. Vui lòng thử lại.",
      503,
      "ORDERS_UNAVAILABLE"
    );
  }

  if (result.modifiedCount !== 1) {
    throw await resolveAtomicPaymentConflict(id, request.user._id);
  }

  response.set("Cache-Control", "no-store");
  response.json({
    success: true,
    message: "Đã chuyển đổi phương thức thanh toán sang COD thành công.",
    data: {
      orderId: id,
      orderCode: order.orderCode,
      paymentMethod: "COD",
      paymentStatus: "unpaid",
    },
  });
}

export { PAYMENT_CONFLICT_ERROR_CODES };

