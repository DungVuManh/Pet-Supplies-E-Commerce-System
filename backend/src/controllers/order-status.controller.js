import { AppError } from "../common/errors/app-error.js";
import { releaseVoucher } from "../common/voucher-redemption.js";
import { orderWithoutReturnStatuses } from "../common/order-auto-complete.js";
import { activeReturnStatuses, Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { notifyCustomer } from "../common/customer-notification.js";
import { parseOrderId, parseStaffOrderStatus, staffOrderTransitions } from "../validators/order.validator.js";

async function checkConfirmation(order) {
  if (order.paymentMethod === "ONLINE" && order.paymentStatus !== "paid") {
    throw new AppError("Đơn thanh toán trực tuyến chưa được xác nhận thanh toán.", 409, "PAYMENT_NOT_VERIFIED");
  }
  try {
    await new Order(order).validate();
  } catch {
    throw new AppError("Thông tin đơn hàng chưa đầy đủ hoặc không hợp lệ.", 409, "ORDER_NOT_CONFIRMABLE");
  }
  const products = await Product.find({ _id: { $in: order.items.map((item) => item.productId) } }).lean();
  const quantities = new Map();
  for (const item of order.items) {
    const key = `${item.productId}:${item.variantSku}`;
    quantities.set(key, (quantities.get(key) || 0) + item.qty);
  }
  for (const item of order.items) {
    const product = products.find((p) => String(p._id) === String(item.productId));
    const variant = product?.variants.find((v) => v.sku === item.variantSku);
    const quantity = quantities.get(`${item.productId}:${item.variantSku}`);
    if (!product?.isActive || !variant
      || ![variant.stock, variant.reservedStock].every((v) => Number.isSafeInteger(v) && v >= 0)
      || variant.stock - variant.reservedStock < quantity) {
      throw new AppError("Sản phẩm không còn bán hoặc tồn khả dụng không đủ để xác nhận đơn.", 409, "OUT_OF_STOCK");
    }
  }
}

export async function updateStaffOrderStatus(request, response) {
  const id = parseOrderId(request.params);
  const input = parseStaffOrderStatus(request.body);
  try {
    const order = await Order.findById(id).lean();
    if (!order || order.creationState === "pending") {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }
    if (order.orderStatus !== input.expectedStatus) {
      throw new AppError("Trạng thái đơn đã thay đổi. Hãy tải lại đơn hàng.", 409, "ORDER_STATUS_CONFLICT");
    }
    if (order.channel !== "online" || !staffOrderTransitions[order.orderStatus]?.includes(input.orderStatus)) {
      throw new AppError("Không được chuyển đơn sang trạng thái đã chọn.", 409, "INVALID_ORDER_TRANSITION");
    }
    if (input.orderStatus === "confirmed") await checkConfirmation(order);

    const changes = { orderStatus: input.orderStatus };
    if (input.shipping) changes.shipping = input.shipping;
    if (input.orderStatus === "cancelled") {
      changes.cancellationReason = input.cancellationReason;
      if (input.cancellationNote) {
        changes.cancellationNote = input.cancellationNote;
      }
    }
    // Status and its audit history must be committed together, including on standalone MongoDB.
    const result = await Order.updateOne({
      _id: id, orderStatus: input.expectedStatus, channel: "online",
      creationState: { $ne: "pending" }, paymentStatus: order.paymentStatus,
    }, {
      $set: changes,
      $push: { statusHistory: { from: input.expectedStatus, to: input.orderStatus, by: request.user._id, at: new Date() } },
    }, { runValidators: true });
    if (result.modifiedCount !== 1) {
      throw new AppError("Đơn hàng đã thay đổi. Hãy tải lại trước khi cập nhật.", 409, "ORDER_STATUS_CONFLICT");
    }
    if (input.orderStatus === "cancelled") await releaseVoucher(id);

    // Bắn thông báo tương ứng cho khách hàng
    if (order.customerId) {
      if (input.orderStatus === "cancelled") {
        const isPaid = order.paymentMethod === "ONLINE" && order.paymentStatus === "paid";
        notifyCustomer({
          userId: order.customerId,
          orderId: order._id,
          type: "order_cancelled",
          title: `Đơn hàng #${order.orderCode} đã bị hủy`,
          message: isPaid
            ? `Đơn hàng đã bị hủy. Lý do: ${input.cancellationReason || "Không có lý do cụ thể"}. Nhân viên sẽ liên hệ với bạn để hoàn tiền.`
            : `Đơn hàng đã bị hủy. Lý do: ${input.cancellationReason || "Không có lý do cụ thể"}.`,
          link: `/orders/${order._id}`,
        });
      } else if (input.orderStatus === "confirmed") {
        notifyCustomer({
          userId: order.customerId,
          orderId: order._id,
          type: "order_confirmed",
          title: `Đơn hàng #${order.orderCode} đã được xác nhận`,
          message: "Cửa hàng đã xác nhận đơn hàng của bạn và đang tiến hành đóng gói.",
          link: `/orders/${order._id}`,
        });
      } else if (input.orderStatus === "shipping") {
        notifyCustomer({
          userId: order.customerId,
          orderId: order._id,
          type: "order_shipping",
          title: `Đơn hàng #${order.orderCode} đang được giao`,
          message: "Kiện hàng của bạn đã được bàn giao cho đơn vị vận chuyển.",
          link: `/orders/${order._id}`,
        });
      }
    }

    response.json({ success: true, data: { order: { id, orderStatus: input.orderStatus } } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Chưa thể xác nhận kết quả cập nhật. Hãy tải lại đơn hàng.", 503, "ORDERS_UNAVAILABLE");
  }
}

export async function confirmCustomerOrderReceipt(request, response) {
  const id = parseOrderId(request.params);
  try {
    const order = await Order.findOne({ _id: id, customerId: request.user._id }).lean();
    if (!order || order.creationState === "pending") {
      throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
    }
    if (order.channel !== "online" || order.orderStatus !== "shipping") {
      throw new AppError("Đơn hàng chưa thể xác nhận đã nhận.", 409, "INVALID_ORDER_TRANSITION");
    }
    if (activeReturnStatuses.includes(order.latestReturn?.status ?? order.returnRequest?.status)) {
      throw new AppError("Đơn hàng đang có yêu cầu hoàn trả, không thể xác nhận đã nhận hàng.", 409, "RETURN_REQUEST_ACTIVE");
    }

    const total = Number.isSafeInteger(order.total) ? order.total : 0;
    const updateFields = {
      orderStatus: "completed",
      paymentStatus: "paid",
      paidAmount: total,
    };

    const result = await Order.updateOne({
      _id: id,
      customerId: request.user._id,
      channel: "online",
      orderStatus: "shipping",
      creationState: { $ne: "pending" },
      ...orderWithoutReturnStatuses(activeReturnStatuses),
    }, {
      $set: updateFields,
      $push: { statusHistory: { from: "shipping", to: "completed", by: request.user._id, at: new Date() } },
    }, { runValidators: true });
    if (result.modifiedCount !== 1) {
      throw new AppError("Trạng thái đơn đã thay đổi. Hãy tải lại đơn hàng.", 409, "ORDER_STATUS_CONFLICT");
    }

    notifyCustomer({
      userId: request.user._id,
      orderId: order._id,
      type: "order_completed",
      title: `Đơn hàng #${order.orderCode} giao thành công`,
      message: "Cảm ơn bạn đã mua hàng tại Petjoy! Hãy để lại đánh giá sản phẩm nhé.",
      link: `/orders/${order._id}`,
    });

    response.json({ success: true, data: { order: { id, orderStatus: "completed" } } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Chưa thể xác nhận đã nhận hàng. Hãy tải lại đơn hàng.", 503, "ORDERS_UNAVAILABLE");
  }
}
