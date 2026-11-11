import { recordAudit } from "../common/audit.js";
import { AppError } from "../common/errors/app-error.js";
import { assertInvoiceEligible, buildStaffOrderInvoice } from "../common/order-invoice.js";
import { AuditLog } from "../models/audit-log.model.js";
import { Order } from "../models/order.model.js";
import { Setting } from "../models/setting.model.js";
import { User } from "../models/user.model.js";
import { parseOrderId } from "../validators/order.validator.js";

async function loadEligibleOrder(id) {
  let order;
  try {
    order = await Order.findById(id).lean();
  } catch {
    throw new AppError(
      "Chưa thể tải dữ liệu hóa đơn. Vui lòng thử lại.",
      503,
      "ORDERS_UNAVAILABLE"
    );
  }

  if (!order || order.creationState === "pending") {
    throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  }

  assertInvoiceEligible(order);
  return order;
}

/**
 * GET /api/v1/staff/orders/:id/invoice
 * Read-only invoice view payload from persisted Order snapshot and store settings.
 */
export async function getStaffOrderInvoice(request, response) {
  const id = parseOrderId(request.params);
  const order = await loadEligibleOrder(id);

  const [setting, staffActor, customerUser, exportCount] = await Promise.all([
    Setting.findOne({ _id: "global" }).lean().catch(() => null),
    order.createdByStaffId
      ? User.findById(order.createdByStaffId)
          .select("_id fullName")
          .lean()
          .catch(() => null)
      : Promise.resolve(null),
    order.customerId
      ? User.findById(order.customerId)
          .select("_id fullName phone email")
          .lean()
          .catch(() => null)
      : Promise.resolve(null),
    AuditLog.countDocuments({
      "target.collectionName": "orders",
      "target.id": String(order._id),
      action: "order.invoice.export",
      result: "success",
    }).catch(() => 0),
  ]);

  const invoice = buildStaffOrderInvoice({
    order,
    setting,
    customerUser,
    createdByStaffName: staffActor?.fullName ?? null,
    currentStaffName: request.user?.fullName ?? "",
    exportCount,
  });

  response.set("Cache-Control", "no-store");
  response.json({
    success: true,
    data: { invoice },
  });
}

/**
 * POST /api/v1/staff/orders/:id/invoice/exports
 * Records an invoice print/export action in AuditLog without modifying the order or stock.
 */
export async function recordStaffOrderInvoiceExport(request, response) {
  const id = parseOrderId(request.params);
  const order = await loadEligibleOrder(id);

  const auditEntry = await recordAudit(request, {
    action: "order.invoice.export",
    target: { collectionName: "orders", id: String(order._id) },
    after: {
      orderCode: order.orderCode,
      orderStatus: order.orderStatus,
      total: order.total,
      channel: order.channel,
    },
    result: "success",
    summary: `Xuất hóa đơn đơn hàng #${order.orderCode}`,
  });

  const exportedAt = auditEntry?.at ? new Date(auditEntry.at) : new Date();

  response.set("Cache-Control", "no-store");
  response.status(201).json({
    success: true,
    data: {
      exportRecord: {
        orderId: String(order._id),
        orderCode: order.orderCode,
        exportedAt: exportedAt.toISOString(),
        exportedBy: request.user?.fullName || "Nhân viên cửa hàng",
      },
    },
  });
}

