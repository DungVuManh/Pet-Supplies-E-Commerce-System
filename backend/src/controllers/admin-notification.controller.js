import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { Setting } from "../models/setting.model.js";
import { AuditLog } from "../models/audit-log.model.js";

/**
 * Formats a Date object to "DD/MM/YYYY · HH:mm" in Vietnam timezone.
 */
function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} · ${hours}:${minutes}`;
}

/**
 * GET /api/v1/admin/notifications
 *
 * Tổng hợp thông báo thời gian thực từ các Model hiện có (Product, Order, Setting, AuditLog):
 *   1. Cảnh báo sắp hết hàng: Tự động quét từ Product khi tồn kho <= lowStockThreshold (nếu lowStockAlert bật)
 *   2. Trạng thái đơn hàng: Lấy danh sách các đơn hàng mới nhất và đơn hàng bị hủy từ Order
 *   3. Hoạt động hệ thống: Lấy các sự kiện thay đổi cấu hình từ AuditLog
 *
 * KHÔNG TẠO MODEL MỚI – Truy vấn trực tiếp từ cơ sở dữ liệu MongoDB thật.
 */
export async function getAdminNotifications(request, response) {
  try {
    const items = [];

    // 1. Kiểm tra cấu hình cảnh báo tồn kho từ Setting
    let lowStockAlertEnabled = true;
    let lowStockThreshold = 20;

    try {
      const setting = await Setting.findById("global").lean();
      if (setting) {
        if (typeof setting.lowStockAlert === "boolean") {
          lowStockAlertEnabled = setting.lowStockAlert;
        }
        if (typeof setting.lowStockThreshold === "number" && setting.lowStockThreshold >= 0) {
          lowStockThreshold = setting.lowStockThreshold;
        }
      }
    } catch {
      // Dùng fallback mặc định
    }

    // 2. Cảnh báo sắp hết hàng (nếu đang bật trong Cấu hình hệ thống)
    if (lowStockAlertEnabled) {
      const activeProducts = await Product.find({ isActive: true })
        .select("name variants createdAt updatedAt")
        .lean();

      for (const prod of activeProducts) {
        for (const variant of prod.variants || []) {
          const stock = typeof variant.stock === "number" ? variant.stock : 0;

          if (stock <= lowStockThreshold) {
            const isOutOfStock = stock === 0;
            const dateObj = prod.updatedAt || prod.createdAt || new Date();

            items.push({
              id: `stock-${prod._id.toString()}-${variant.sku}`,
              type: "stock",
              title: isOutOfStock
                ? `Hết hàng: ${prod.name} (SKU: ${variant.sku})`
                : `Cảnh báo tồn kho: ${prod.name} dưới định mức`,
              detail: isOutOfStock
                ? `Sản phẩm "${prod.name}" biến thể ${variant.sku} đã hết hàng hoàn toàn (0 sản phẩm trong kho). Cần lập phiếu nhập kho khẩn cấp.`
                : `Tồn kho khả dụng hiện tại là ${stock} sản phẩm (dưới định mức an toàn ${lowStockThreshold}). Cần lập phiếu nhập hàng bổ sung.`,
              createdAt: formatTime(dateObj),
              rawDate: dateObj,
              targetHref: `/admin/inventory?q=${variant.sku}`,
              reference: `SKU: ${variant.sku}`,
            });
          }
        }
      }
    }

    // 3. Trạng thái đơn hàng (Đơn mới, Đang giao, Đã hủy...)
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    const statusMap = {
      pending: "chờ xử lý",
      confirmed: "đã xác nhận",
      processing: "đang xử lý",
      shipping: "đang giao hàng",
      completed: "hoàn tất",
      cancelled: "đã hủy",
    };

    for (const order of recentOrders) {
      const ref = `#${order.orderCode || order._id.toString()}`;
      const recipient =
        order.shippingAddress?.recipientName || order.guestInfo?.name || "Khách hàng";
      const totalStr = (order.total || 0).toLocaleString("vi-VN") + " ₫";
      const payment = order.paymentMethod || "COD";
      const isCancelled = order.orderStatus === "cancelled";
      const statusLabel = statusMap[order.orderStatus] || order.orderStatus;
      const dateObj = order.createdAt || new Date();

      items.push({
        id: `order-${order._id.toString()}`,
        type: "order",
        title: isCancelled
          ? `Đơn hàng ${ref} đã hủy`
          : `Đơn hàng mới ${ref} (${statusLabel})`,
        detail: isCancelled
          ? `Đơn hàng trị giá ${totalStr} của khách hàng ${recipient} đã bị hủy.`
          : `Khách hàng ${recipient} đã đặt đơn hàng trị giá ${totalStr} (${payment}). Trạng thái hiện tại: ${statusLabel}.`,
        createdAt: formatTime(dateObj),
        rawDate: dateObj,
        // Staff handle cancellations, so every order notification opens the order itself.
        targetHref: `/admin/orders?q=${order.orderCode || order._id.toString()}`,
        reference: ref,
      });
    }

    // 4. Hoạt động hệ thống gần nhất từ AuditLog
    const auditLogs = await AuditLog.find()
      .sort({ at: -1 })
      .limit(10)
      .lean();

    for (const log of auditLogs) {
      const dateObj = log.at || new Date();
      items.push({
        id: `system-${log._id.toString()}`,
        type: "system",
        title: log.summary || `Hoạt động hệ thống: ${log.action}`,
        detail: `Hành động: ${log.action} trên ${log.target?.collectionName || "hệ thống"}. Kết quả: ${log.result || "success"}.`,
        createdAt: formatTime(dateObj),
        rawDate: dateObj,
        targetHref: "/admin/system/audit",
        reference: `Audit #${log._id.toString().slice(-6)}`,
      });
    }

    // 5. Sắp xếp thông báo theo thời gian thực tế mới nhất lên đầu
    items.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    // Làm sạch trường nội bộ rawDate trước khi trả về
    const cleanItems = items.map(({ rawDate, ...rest }) => rest);

    return response.status(200).json({
      success: true,
      data: {
        items: cleanItems,
        total: cleanItems.length,
      },
    });
  } catch (err) {
    console.error("[getAdminNotifications] Error:", err);
    return response.status(500).json({
      success: false,
      message: "Không thể tải danh sách thông báo từ cơ sở dữ liệu.",
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
}

