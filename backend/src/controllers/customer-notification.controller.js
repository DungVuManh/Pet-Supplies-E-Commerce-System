import { AppError } from "../common/errors/app-error.js";
import { Notification } from "../models/notification.model.js";

/**
 * GET /api/v1/customer/notifications
 * Lấy danh sách thông báo của khách hàng đang đăng nhập kèm unreadCount
 */
export async function getCustomerNotifications(request, response, next) {
  try {
    const userId = request.user._id;
    const page = Math.max(1, parseInt(request.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(request.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { userId };
    if (request.query.unreadOnly === "true") {
      query.read = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, read: false }),
    ]);

    response.json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: String(item._id),
          orderId: item.orderId ? String(item.orderId) : null,
          type: item.type,
          title: item.title || "",
          message: item.message || "",
          link: item.link || null,
          read: Boolean(item.read),
          createdAt: item.createdAt,
        })),
        unreadCount,
        pagination: {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/customer/notifications/:id/read
 * Đánh dấu 1 thông báo cụ thể là đã đọc
 */
export async function markNotificationAsRead(request, response, next) {
  try {
    const userId = request.user._id;
    const { id } = request.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new AppError("Mã thông báo không hợp lệ.", 400, "VALIDATION_ERROR");
    }

    const result = await Notification.updateOne(
      { _id: id, userId },
      { $set: { read: true, readAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      throw new AppError("Không tìm thấy thông báo.", 404, "NOT_FOUND");
    }

    response.json({
      success: true,
      data: { id, read: true },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/customer/notifications/read-all
 * Đánh dấu tất cả thông báo của khách hàng là đã đọc
 */
export async function markAllNotificationsAsRead(request, response, next) {
  try {
    const userId = request.user._id;

    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    response.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

