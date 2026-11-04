// =============================================================
// backend/src/controllers/payment.controller.js
// Bộ điều khiển xử lý thanh toán VietQR và Webhook SePay
// =============================================================

import { logPaymentAudit } from "../common/audit.js";
import { AppError } from "../common/errors/app-error.js";
import {
  extractOrderCodeFromMemo,
  formatTransferMemo,
  generateVietQrPayload,
  generateVietQrUrl,
} from "../common/sepay-service.js";
import { Order } from "../models/order.model.js";
import { Payment } from "../models/payment.model.js";
import { Setting } from "../models/setting.model.js";
import {
  parseOrderCode,
  parseSepayWebhook,
} from "../validators/payment.validator.js";

/**
 * Lấy cấu hình tài khoản ngân hàng thụ hưởng từ Setting hoặc biến môi trường
 */
async function getEffectiveBankConfig(config) {
  let setting = null;
  try {
    setting = await Setting.findOne({ _id: "global" }).lean();
  } catch {
    // Nếu chưa khởi tạo setting thì dùng biến môi trường
  }

  const bankCode =
    setting?.bankCode ||
    config?.SEPAY_BANK_CODE ||
    process.env.SEPAY_BANK_CODE ||
    "MB";

  const accountNumber =
    setting?.accountNumber ||
    config?.SEPAY_ACCOUNT_NUMBER ||
    process.env.SEPAY_ACCOUNT_NUMBER ||
    "";

  const accountHolder =
    setting?.accountHolder ||
    config?.SEPAY_ACCOUNT_HOLDER ||
    process.env.SEPAY_ACCOUNT_HOLDER ||
    "PETLY STORE";

  return { bankCode, accountNumber, accountHolder };
}

/**
 * GET /api/v1/payments/sepay/info/:orderCode
 * Lấy thông tin chi tiết thanh toán VietQR động cho đơn hàng
 */
export async function getPaymentInfo(request, response, next) {
  try {
    const orderCode = parseOrderCode(request.params.orderCode);

    const order = await Order.findOne({ orderCode });
    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng yêu cầu.", 404, "ORDER_NOT_FOUND");
    }

    const bankConfig = await getEffectiveBankConfig(request.app?.locals?.config);
    const paidAmount = order.paidAmount || 0;
    const remainingAmount = Math.max(0, order.total - paidAmount);
    const memo = formatTransferMemo(order.orderCode);

    // Tính thời gian hết hạn phiên QR (15 phút từ lúc tạo hoặc gia hạn)
    const paymentExpiredAt =
      order.paymentExpiredAt ||
      new Date(new Date(order.createdAt).getTime() + 15 * 60 * 1000);

    const secondsLeft = Math.max(
      0,
      Math.floor((paymentExpiredAt.getTime() - Date.now()) / 1000)
    );
    const isExpired = secondsLeft === 0 && order.paymentStatus !== "paid";
    const isPaid = order.paymentStatus === "paid";

    const qrUrl = generateVietQrUrl({
      bankCode: bankConfig.bankCode,
      accountNumber: bankConfig.accountNumber,
      amount: remainingAmount > 0 ? remainingAmount : order.total,
      memo,
      accountHolder: bankConfig.accountHolder,
    });

    const qrPayload = generateVietQrPayload({
      bankCode: bankConfig.bankCode,
      accountNumber: bankConfig.accountNumber,
      amount: remainingAmount > 0 ? remainingAmount : order.total,
      memo,
    });

    return response.status(200).json({
      success: true,
      data: {
        orderCode: order.orderCode,
        total: order.total,
        paidAmount,
        remainingAmount,
        bankCode: bankConfig.bankCode,
        accountNumber: bankConfig.accountNumber,
        accountHolder: bankConfig.accountHolder,
        memo,
        qrUrl,
        qrPayload,
        paymentExpiredAt: paymentExpiredAt.toISOString(),
        secondsLeft,
        isExpired,
        isPaid,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/payments/sepay/webhook
 * Tiếp nhận thông báo biến động số dư từ SePay Webhook
 */
export async function handleSepayWebhook(request, response, next) {
  try {
    const payload = parseSepayWebhook(request.body);

    // Chỉ xử lý các giao dịch nhận tiền ('in')
    if (payload.transferType !== "in") {
      return response.status(200).json({
        success: true,
        message: "Bỏ qua giao dịch tiền ra khỏi tài khoản.",
      });
    }

    // Trích xuất mã đơn hàng từ nội dung giao dịch hoặc trường code
    const extractedOrderCode =
      extractOrderCodeFromMemo(payload.content) ||
      (payload.code ? extractOrderCodeFromMemo(payload.code) : null);

    logPaymentAudit({
      action: "SEPAY_WEBHOOK_RECEIVED",
      orderCode: extractedOrderCode || "UNKNOWN",
      details: {
        transferAmount: payload.transferAmount,
        gateway: payload.gateway,
        id: payload.id,
      },
      ip: request.ip,
    });

    if (!extractedOrderCode) {
      // Không trích xuất được mã đơn: phản hồi 200 để SePay không retry
      console.warn("SePay Webhook không nhận diện được mã đơn hàng từ nội dung:", payload.content);
      return response.status(200).json({
        success: true,
        message: "Không trích xuất được mã đơn hàng từ nội dung giao dịch. Đã lưu đối soát.",
      });
    }

    const order = await Order.findOne({ orderCode: extractedOrderCode });
    if (!order) {
      console.warn(`SePay Webhook: Không tìm thấy đơn hàng mã ${extractedOrderCode}`);
      return response.status(200).json({
        success: true,
        message: `Không tìm thấy đơn hàng ${extractedOrderCode} trong hệ thống.`,
      });
    }

    // 1. Kiểm tra tính bất biến (Idempotency - BR-16):
    const transactionRef = String(payload.id);
    const existingPayment = await Payment.findOne({ transactionRef });
    if (existingPayment) {
      return response.status(200).json({
        success: true,
        message: "Giao dịch này đã được ghi nhận trước đó (Idempotent).",
      });
    }

    // 2. Ghi nhận bản ghi Payment mới (CR-06)
    await Payment.create({
      orderId: order._id,
      method: "ONLINE",
      amount: payload.transferAmount,
      status: "paid",
      transactionRef,
      rawResult: payload,
    });

    // 3. Tính toán tổng số tiền thanh toán lũy kế (Partial Payment handling)
    const currentPaid = order.paidAmount || 0;
    const newPaidAmount = currentPaid + payload.transferAmount;
    const isFullyPaid = newPaidAmount >= order.total;
    const isExcess = newPaidAmount > order.total;
    const isLateAfterCod = order.paymentMethod === "COD";

    const updateDoc = {
      $set: {
        paidAmount: newPaidAmount,
      },
    };

    if (isFullyPaid) {
      updateDoc.$set.paymentStatus = "paid";
      updateDoc.$push = {
        statusHistory: {
          to: order.orderStatus,
          at: new Date(),
        },
      };

      logPaymentAudit({
        action: "SEPAY_PAYMENT_VERIFIED",
        orderCode: order.orderCode,
        details: {
          transactionRef,
          amount: payload.transferAmount,
          paidAmount: newPaidAmount,
          total: order.total,
        },
        ip: request.ip,
      });
    }

    // Nếu chuyển thừa tiền hoặc chuyển sau khi đã đổi sang COD -> gắn cờ needsReview
    if (isExcess || isLateAfterCod) {
      updateDoc.$set.needsReview = true;

      logPaymentAudit({
        action: "ORDER_NEEDS_REVIEW",
        orderCode: order.orderCode,
        details: {
          isExcess,
          isLateAfterCod,
          newPaidAmount,
          total: order.total,
          transactionRef,
        },
        ip: request.ip,
      });
    }

    await Order.updateOne({ _id: order._id }, updateDoc);

    return response.status(200).json({
      success: true,
      message: "Giao dịch thanh toán được xử lý và cập nhật thành công.",
      data: {
        orderCode: order.orderCode,
        paidAmount: newPaidAmount,
        total: order.total,
        isPaid: isFullyPaid,
        needsReview: Boolean(isExcess || isLateAfterCod),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/payments/status/:orderCode
 * Truy vấn trạng thái thanh toán thời gian thực (phục vụ Polling 3s hoặc bấm kiểm tra)
 */
export async function getPaymentStatus(request, response, next) {
  try {
    const orderCode = parseOrderCode(request.params.orderCode);

    const order = await Order.findOne({ orderCode })
      .select("orderCode paymentMethod paymentStatus orderStatus total paidAmount needsReview paymentExpiredAt createdAt")
      .lean();

    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    const paidAmount = order.paidAmount || 0;
    const remainingAmount = Math.max(0, order.total - paidAmount);
    const isPaid = order.paymentStatus === "paid";

    const paymentExpiredAt =
      order.paymentExpiredAt ||
      new Date(new Date(order.createdAt).getTime() + 15 * 60 * 1000);

    const secondsLeft = Math.max(
      0,
      Math.floor((new Date(paymentExpiredAt).getTime() - Date.now()) / 1000)
    );
    const isExpired = secondsLeft === 0 && !isPaid;

    return response.status(200).json({
      success: true,
      data: {
        orderCode: order.orderCode,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        total: order.total,
        paidAmount,
        remainingAmount,
        isPaid,
        isExpired,
        needsReview: Boolean(order.needsReview),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/payments/renew-session/:orderCode
 * Gia hạn phiên thanh toán VietQR thêm 15 phút
 */
export async function renewPaymentSession(request, response, next) {
  try {
    const orderCode = parseOrderCode(request.params.orderCode);
    const order = await Order.findOne({ orderCode });
    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    if (order.paymentStatus === "paid") {
      throw new AppError("Đơn hàng này đã được thanh toán.", 400, "ORDER_ALREADY_PAID");
    }

    const newExpiredAt = new Date(Date.now() + 15 * 60 * 1000);
    order.paymentExpiredAt = newExpiredAt;
    await order.save();

    return response.status(200).json({
      success: true,
      message: "Đã gia hạn phiên thanh toán thêm 15 phút.",
      data: {
        orderCode: order.orderCode,
        paymentExpiredAt: newExpiredAt.toISOString(),
        secondsLeft: 900,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/payments/convert-to-cod/:orderCode
 * Chuyển đổi phương thức thanh toán sang COD khi phiên QR hết hạn
 */
export async function convertToCod(request, response, next) {
  try {
    const orderCode = parseOrderCode(request.params.orderCode);
    const order = await Order.findOne({ orderCode });
    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }

    if (order.paymentStatus === "paid") {
      throw new AppError("Đơn hàng đã thanh toán thành công, không thể đổi sang COD.", 400, "ORDER_ALREADY_PAID");
    }

    order.paymentMethod = "COD";
    order.paymentStatus = "unpaid";
    await order.save();

    return response.status(200).json({
      success: true,
      message: "Đã chuyển đổi phương thức thanh toán sang COD thành công.",
      data: {
        orderCode: order.orderCode,
        paymentMethod: "COD",
        paymentStatus: "unpaid",
      },
    });
  } catch (error) {
    next(error);
  }
}
