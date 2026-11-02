import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import { AdminNotification } from "../models/admin-notification.model.js";
import { Order, Product, AuditLog, Setting } from "../models/index.js";
import {
  parseListAdminNotificationsQuery,
  parseCreateAdminNotification,
  parseUpdateNotificationRead,
  parseUpdateNotificationSave,
} from "../validators/admin-notification.validator.js";

/**
 * Tự động đồng bộ các thông báo vận hành từ dữ liệu thực tế trong cơ sở dữ liệu MongoDB:
 * - Đơn hàng thực tế trong Order collection
 * - Sản phẩm tồn kho thấp (dưới ngưỡng định mức 20) hoặc hết hàng trong Product collection
 * - Hoạt động hệ thống trong AuditLog collection
 */
export async function syncRealAdminNotifications() {
  if (mongoose.connection?.readyState !== 1) {
    return;
  }
  try {
    // 1. Xóa toàn bộ thông báo mẫu giả cũ nếu còn sót lại
    await AdminNotification.deleteMany({
      reference: {
        $in: ["#PA261012018", "SKU: CT-BEN-10L", "YC002", "Hệ thống", "PN-261011-003", "Chính sách"],
      },
    });

    // 2. Đồng bộ các đơn hàng thực tế từ MongoDB
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    for (const order of recentOrders) {
      const ref = `#${order.orderCode || order._id.toString()}`;
      const recipient =
        order.shippingAddress?.recipientName || order.guestInfo?.name || "Khách hàng";
      const totalStr = (order.total || 0).toLocaleString("vi-VN") + " ₫";
      const payment = order.paymentMethod || "COD";
      const isCancelled = order.orderStatus === "cancelled";

      const statusMap = {
        pending: "chờ xử lý",
        confirmed: "đã xác nhận",
        shipping: "đang giao",
        completed: "hoàn tất",
        cancelled: "đã hủy",
      };
      const statusLabel = statusMap[order.orderStatus] || order.orderStatus;

      const title = isCancelled
        ? `Yêu cầu hủy đơn hàng ${ref}`
        : `Đơn hàng mới ${ref} (${statusLabel})`;

      const detail = isCancelled
        ? `Đơn hàng trị giá ${totalStr} của khách hàng ${recipient} đã bị hủy.`
        : `Khách hàng ${recipient} đã đặt đơn hàng trị giá ${totalStr} (${payment}).`;

      const targetHref = isCancelled
        ? "/admin/cancellations"
        : `/admin/orders?q=${order.orderCode || order._id.toString()}`;

      await AdminNotification.updateOne(
        { type: "order", reference: ref },
        {
          $setOnInsert: {
            type: "order",
            reference: ref,
            title,
            detail,
            targetHref,
            createdAt: order.createdAt || new Date(),
            readBy: [],
            savedBy: [],
          },
        },
        { upsert: true, timestamps: false }
      );
    }

    // 3. Lấy định mức tồn kho an toàn (mặc định là 20 sản phẩm)
    let lowStockThreshold = 20;
    try {
      const setting = await Setting.findById("global").lean();
      if (setting?.lowStockThreshold && typeof setting.lowStockThreshold === "number") {
        lowStockThreshold = Math.max(setting.lowStockThreshold, 20);
      }
    } catch {
      // Fallback 20
    }

    // 4. Đồng bộ các sản phẩm thực tế từ Product collection
    const allProducts = await Product.find({ isActive: true }).lean();

    for (const prod of allProducts) {
      for (const variant of prod.variants || []) {
        const ref = `SKU: ${variant.sku}`;
        const stock = typeof variant.stock === "number" ? variant.stock : 0;

        if (stock <= lowStockThreshold) {
          const isOutOfStock = stock === 0;

          const title = isOutOfStock
            ? `Hết hàng: ${prod.name} (SKU: ${variant.sku})`
            : `Cảnh báo tồn kho: ${prod.name} dưới định mức`;

          const detail = isOutOfStock
            ? `Sản phẩm ${prod.name} biến thể ${variant.sku} đã hết hàng hoàn toàn (0 sản phẩm trong kho). Cần lập phiếu nhập kho khẩn cấp.`
            : `Tồn kho khả dụng hiện tại là ${stock} sản phẩm (dưới định mức cảnh báo an toàn ${lowStockThreshold}). Cần lập phiếu nhập hàng bổ sung.`;

          const targetHref = `/admin/inventory?q=${variant.sku}`;

          const existing = await AdminNotification.findOne({ type: "stock", reference: ref });

          if (!existing) {
            // Chưa có thông báo cảnh báo cho SKU này -> tạo mới
            await AdminNotification.create({
              type: "stock",
              reference: ref,
              title,
              detail,
              targetHref,
              createdAt: prod.updatedAt || prod.createdAt || new Date(),
              readBy: [],
              savedBy: [],
            });
          } else if (existing.detail !== detail || existing.title !== title) {
            // Số lượng tồn kho vừa thay đổi trong database -> cập nhật nội dung và đưa về chưa đọc
            await AdminNotification.updateOne(
              { _id: existing._id },
              {
                $set: {
                  title,
                  detail,
                  targetHref,
                  updatedAt: new Date(),
                },
                $pullAll: { readBy: existing.readBy }, // Reset trạng thái đọc để admin thấy cảnh báo cập nhật mới
              }
            );
          }
        } else {
          // Nếu sản phẩm đã được nhập thêm kho > 20 -> tự động giải tỏa cảnh báo tồn kho cũ
          await AdminNotification.deleteMany({ type: "stock", reference: ref });
        }
      }
    }

    // 5. Đồng bộ nhật ký kiểm toán thực tế trong AuditLog
    const auditLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    for (const log of auditLogs) {
      const ref = `Audit #${log._id.toString()}`;
      const actionLabels = {
        "admin.access": "Truy cập quyền quản trị viên",
        "staff.access": "Truy cập tài khoản nhân viên",
        "seed.sample-data": "Khởi tạo dữ liệu mẫu hệ thống",
        "auth.login": "Đăng nhập hệ thống",
      };
      const actionName = actionLabels[log.action] || log.action || "Hoạt động hệ thống";

      const title = `Nhật ký hệ thống: ${actionName}`;
      const detail = `Hệ thống ghi nhận hoạt động ${log.action} trên tài nguyên ${log.targetType || "hệ thống"}.`;
      const targetHref = "/admin/system/audit-log";

      await AdminNotification.updateOne(
        { type: "system", reference: ref },
        {
          $setOnInsert: {
            type: "system",
            reference: ref,
            title,
            detail,
            targetHref,
            createdAt: log.createdAt || new Date(),
            readBy: [],
            savedBy: [],
          },
        },
        { upsert: true, timestamps: false }
      );
    }
  } catch (err) {
    console.error("[admin-notification] Error syncing real notifications:", err?.message);
  }
}

/**
 * GET /api/v1/admin/notifications
 * Lấy danh sách thông báo admin từ cơ sở dữ liệu MongoDB
 */
export async function listAdminNotifications(request, response) {
  const { tab, type, status, q, page, limit } = parseListAdminNotificationsQuery(request.query);
  const userId = request.user._id;

  // Luôn đồng bộ dữ liệu tồn kho và đơn hàng mới nhất từ MongoDB
  try {
    await syncRealAdminNotifications();
  } catch {
    // Không gián đoạn nếu môi trường test không có kết nối DB
  }

  const filter = {};

  // 1. Lọc theo Tab
  if (tab === "unread") {
    filter.readBy = { $ne: userId };
  } else if (tab === "saved") {
    filter.savedBy = userId;
  }

  // 2. Lọc theo trạng thái đọc (nếu truyền tường minh)
  if (status === "unread") {
    filter.readBy = { $ne: userId };
  } else if (status === "read") {
    filter.readBy = userId;
  }

  // 3. Lọc theo loại thông báo (order, stock, system)
  if (type !== "all") {
    filter.type = type;
  }

  // 4. Tìm kiếm từ khóa (tiêu đề, chi tiết, mã tham chiếu)
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [{ title: regex }, { detail: regex }, { reference: regex }];
  }

  const skip = (page - 1) * limit;

  const [docs, total, unreadCount, allCount, savedCount] = await Promise.all([
    AdminNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AdminNotification.countDocuments(filter),
    AdminNotification.countDocuments({ readBy: { $ne: userId } }),
    AdminNotification.countDocuments(),
    AdminNotification.countDocuments({ savedBy: userId }),
  ]);

  const pad = (n) => String(n).padStart(2, "0");

  const items = docs.map((doc) => {
    const isRead =
      Array.isArray(doc.readBy) && doc.readBy.some((id) => id.toString() === userId.toString());
    const isSaved =
      Array.isArray(doc.savedBy) && doc.savedBy.some((id) => id.toString() === userId.toString());

    const d = new Date(doc.createdAt);
    const formattedDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    return {
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      detail: doc.detail || "",
      createdAt: formattedDate,
      rawCreatedAt: doc.createdAt,
      read: isRead,
      saved: isSaved,
      targetHref: doc.targetHref || "",
      reference: doc.reference || "",
    };
  });

  return response.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      counts: {
        unread: unreadCount,
        all: allCount,
        saved: savedCount,
      },
    },
  });
}

/**
 * PATCH /api/v1/admin/notifications/:id/read
 * Đánh dấu đã đọc hoặc chưa đọc thông báo cho Admin hiện tại
 */
export async function markNotificationRead(request, response) {
  const { id } = request.params;
  const userId = request.user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("ID thông báo không hợp lệ.", 400, "VALIDATION_ERROR");
  }

  const { read } = parseUpdateNotificationRead(request.body || {});

  const notification = await AdminNotification.findById(id);
  if (!notification) {
    throw new AppError("Không tìm thấy thông báo.", 404, "NOT_FOUND");
  }

  const isCurrentlyRead =
    notification.readBy.some((uid) => uid.toString() === userId.toString());
  const shouldRead = typeof read === "boolean" ? read : !isCurrentlyRead;

  if (shouldRead) {
    await AdminNotification.updateOne({ _id: id }, { $addToSet: { readBy: userId } });
  } else {
    await AdminNotification.updateOne({ _id: id }, { $pull: { readBy: userId } });
  }

  return response.status(200).json({
    success: true,
    data: { id, read: shouldRead },
  });
}

/**
 * PATCH /api/v1/admin/notifications/:id/save
 * Lưu hoặc bỏ lưu thông báo cho Admin hiện tại
 */
export async function markNotificationSaved(request, response) {
  const { id } = request.params;
  const userId = request.user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("ID thông báo không hợp lệ.", 400, "VALIDATION_ERROR");
  }

  const { saved } = parseUpdateNotificationSave(request.body || {});

  const notification = await AdminNotification.findById(id);
  if (!notification) {
    throw new AppError("Không tìm thấy thông báo.", 404, "NOT_FOUND");
  }

  const isCurrentlySaved =
    notification.savedBy.some((uid) => uid.toString() === userId.toString());
  const shouldSave = typeof saved === "boolean" ? saved : !isCurrentlySaved;

  if (shouldSave) {
    await AdminNotification.updateOne({ _id: id }, { $addToSet: { savedBy: userId } });
  } else {
    await AdminNotification.updateOne({ _id: id }, { $pull: { savedBy: userId } });
  }

  return response.status(200).json({
    success: true,
    data: { id, saved: shouldSave },
  });
}

/**
 * POST /api/v1/admin/notifications/mark-all-read
 * Đánh dấu tất cả thông báo là đã đọc cho Admin hiện tại
 */
export async function markAllNotificationsRead(request, response) {
  const userId = request.user._id;

  const result = await AdminNotification.updateMany(
    { readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  return response.status(200).json({
    success: true,
    data: { updatedCount: result.modifiedCount },
  });
}

/**
 * POST /api/v1/admin/notifications
 * Tạo thông báo mới cho toàn bộ Admin
 */
export async function createAdminNotification(request, response) {
  const payload = parseCreateAdminNotification(request.body);

  const doc = await AdminNotification.create(payload);

  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date(doc.createdAt);
  const formattedDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return response.status(201).json({
    success: true,
    data: {
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      detail: doc.detail || "",
      createdAt: formattedDate,
      rawCreatedAt: doc.createdAt,
      read: false,
      saved: false,
      targetHref: doc.targetHref || "",
      reference: doc.reference || "",
    },
  });
}

/**
 * DELETE /api/v1/admin/notifications/:id
 * Xóa một thông báo khỏi hệ thống
 */
export async function deleteAdminNotification(request, response) {
  const { id } = request.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("ID thông báo không hợp lệ.", 400, "VALIDATION_ERROR");
  }

  const result = await AdminNotification.findByIdAndDelete(id);
  if (!result) {
    throw new AppError("Không tìm thấy thông báo.", 404, "NOT_FOUND");
  }

  return response.status(200).json({
    success: true,
    data: { id, deleted: true },
  });
}
