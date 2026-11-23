import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { Notification } from "../src/models/notification.model.js";

const config = {
  NODE_ENV: "test",
  CORS_ORIGIN: ["http://localhost:3000"],
};

const userId = new mongoose.Types.ObjectId().toString();
const otherUserId = new mongoose.Types.ObjectId().toString();

vi.mock("../src/common/middlewares/auth.middleware.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { _id: userId, email: "customer@example.com", role: "customer" };
    next();
  },
  optionalAuth: (req, _res, next) => next(),
  readCookies: (_req, _res, next) => next(),
  requireRole: () => (_req, _res, next) => next(),
}));

describe("Customer Notifications API", () => {
  const app = createApp(config);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/v1/customer/notifications returns items and unreadCount", async () => {
    const mockNotifications = [
      {
        _id: new mongoose.Types.ObjectId(),
        userId,
        type: "order_cancelled",
        title: "Đơn hàng bị hủy",
        message: "Hết hàng",
        link: "/orders/123",
        read: false,
        createdAt: new Date(),
      },
    ];

    vi.spyOn(Notification, "find").mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => mockNotifications,
          }),
        }),
      }),
    });
    vi.spyOn(Notification, "countDocuments")
      .mockResolvedValueOnce(1) // total
      .mockResolvedValueOnce(1); // unreadCount

    const res = await request(app).get("/api/v1/customer/notifications").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe("Đơn hàng bị hủy");
    expect(res.body.data.unreadCount).toBe(1);
  });

  it("PATCH /api/v1/customer/notifications/:id/read marks notification as read", async () => {
    const notifId = new mongoose.Types.ObjectId().toString();

    vi.spyOn(Notification, "updateOne").mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    });

    const res = await request(app)
      .patch(`/api/v1/customer/notifications/${notifId}/read`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.read).toBe(true);
  });

  it("POST /api/v1/customer/notifications/read-all marks all notifications as read", async () => {
    vi.spyOn(Notification, "updateMany").mockResolvedValue({
      modifiedCount: 3,
    });

    const res = await request(app)
      .post("/api/v1/customer/notifications/read-all")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.modifiedCount).toBe(3);
  });
});
