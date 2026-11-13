import { AppError } from "./errors/app-error.js";

export const INVOICE_ELIGIBLE_STATUSES = [
  "confirmed",
  "processing",
  "shipping",
  "completed",
];

function cleanText(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : "";
}

/**
 * Enforces business eligibility for generating or exporting a customer invoice:
 * only orders at or past confirmation (`confirmed`, `processing`, `shipping`, `completed`).
 */
export function assertInvoiceEligible(order) {
  if (!order) {
    throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  }
  if (order.orderStatus === "cancelled") {
    throw new AppError(
      "Đơn hàng đã hủy không thể xuất hóa đơn.",
      409,
      "INVOICE_NOT_ELIGIBLE"
    );
  }
  if (!INVOICE_ELIGIBLE_STATUSES.includes(order.orderStatus)) {
    throw new AppError(
      "Chỉ hỗ trợ xuất hóa đơn cho đơn hàng từ trạng thái Đã xác nhận trở lên.",
      409,
      "INVOICE_NOT_ELIGIBLE"
    );
  }
}

/**
 * Builds the immutable invoice view payload solely from persisted Order snapshot data,
 * active global store settings (with safe fallbacks), and staff metadata.
 */
export function buildStaffOrderInvoice({
  order,
  setting = null,
  customerUser = null,
  createdByStaffName = null,
  currentStaffName = "",
  exportCount = 0,
  now = new Date(),
}) {
  const store = {
    name: cleanText(setting?.storeName) || "Petjoy",
    address: cleanText(setting?.address),
    hotline: cleanText(setting?.hotline),
    email: cleanText(setting?.contactEmail),
  };

  const customerName =
    cleanText(order.guestInfo?.name) ||
    cleanText(order.shippingAddress?.recipientName) ||
    cleanText(customerUser?.fullName) ||
    "Khách lẻ";
  const customerPhone =
    cleanText(order.guestInfo?.phone) ||
    cleanText(order.shippingAddress?.phone) ||
    cleanText(customerUser?.phone);
  const customerEmail =
    cleanText(order.guestInfo?.email) ||
    cleanText(order.email) ||
    cleanText(customerUser?.email) ||
    null;

  const channel = order.channel === "offline" ? "offline" : "online";
  const shippingAddress =
    channel === "offline"
      ? null
      : {
          recipientName: cleanText(order.shippingAddress?.recipientName) || customerName,
          phone: cleanText(order.shippingAddress?.phone) || customerPhone,
          province: cleanText(order.shippingAddress?.province),
          district: cleanText(order.shippingAddress?.district),
          ward: cleanText(order.shippingAddress?.ward),
          street: cleanText(order.shippingAddress?.street),
        };

  const items = (order.items || []).map((item) => {
    const unitPrice = Number.isSafeInteger(item.unitPrice) ? item.unitPrice : 0;
    const qty = Number.isSafeInteger(item.qty) ? item.qty : 0;
    return {
      variantSku: item.variantSku,
      name: item.name,
      unitPrice,
      qty,
      lineTotal: unitPrice * qty,
    };
  });

  const subtotal = Number.isSafeInteger(order.subtotal) ? order.subtotal : 0;
  const discount = Number.isSafeInteger(order.discount) ? order.discount : 0;
  const shippingFee = Number.isSafeInteger(order.shippingFee) ? order.shippingFee : 0;
  const total = Number.isSafeInteger(order.total) ? order.total : 0;

  const rawPaid = Number.isSafeInteger(order.paidAmount) ? order.paidAmount : 0;
  const paidAmount =
    rawPaid > 0 ? rawPaid : order.paymentStatus === "paid" ? total : 0;
  const remainingAmount =
    order.paymentStatus === "paid" ? 0 : Math.max(0, total - paidAmount);

  return {
    store,
    order: {
      id: String(order._id),
      orderCode: order.orderCode,
      createdAt: order.createdAt
        ? new Date(order.createdAt).toISOString()
        : now.toISOString(),
      channel,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      shippingAddress,
      items,
      subtotal,
      discount,
      promotionCode: cleanText(order.promotionCode) || null,
      shippingFee,
      total,
      paidAmount,
      remainingAmount,
      needsReview: Boolean(order.needsReview),
      createdByStaff: cleanText(createdByStaffName) || null,
    },
    invoiceMeta: {
      generatedAt: now.toISOString(),
      generatedBy: cleanText(currentStaffName) || "Nhân viên cửa hàng",
      exportCount: Number.isSafeInteger(exportCount) && exportCount >= 0 ? exportCount : 0,
    },
  };
}

