import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import {
  AUTO_COMPLETE_AFTER_MS,
  autoCompleteOverdueShippingOrders,
  isShippingOrderOverdue,
  resolveShippingStartedAt,
  startOrderAutoCompleteScheduler,
} from "../src/common/order-auto-complete.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { User, userRepository } from "../src/models/user.model.js";

const staffId = "b".repeat(24);
const customerId = "c".repeat(24);
const productId = "d".repeat(24);
const HOUR_MS = 60 * 60 * 1000;

function makeId(index) {
  return String(index).padStart(24, "0");
}

function buildFindChain(getRows) {
  return {
    select() {
      return this;
    },
    sort(sortSpec) {
      this._sort = sortSpec;
      return this;
    },
    limit(limitValue) {
      this._limit = limitValue;
      return this;
    },
    lean() {
      let rows = [...getRows()];
      if (this._sort?._id === 1) {
        rows.sort((a, b) => String(a._id).localeCompare(String(b._id)));
      }
      if (Number.isInteger(this._limit)) {
        rows = rows.slice(0, this._limit);
      }
      return Promise.resolve(rows);
    },
  };
}

describe("Auto-complete overdue shipping orders (3 days / 72h)", () => {
  let ordersStore;
  const now = new Date("2026-11-12T12:00:00.000Z");

  function installOrderStoreMocks() {
    vi.spyOn(Order, "find").mockImplementation((filter = {}) => {
      return buildFindChain(() =>
        ordersStore.filter((order) => {
          if (filter.channel && order.channel !== filter.channel) return false;
          if (filter.orderStatus && order.orderStatus !== filter.orderStatus) {
            return false;
          }
          if (
            filter.creationState?.$ne &&
            order.creationState === filter.creationState.$ne
          ) {
            return false;
          }
          if (
            filter.createdAt?.$lte &&
            new Date(order.createdAt).getTime() > filter.createdAt.$lte.getTime()
          ) {
            return false;
          }
          if (
            filter._id?.$gt &&
            String(order._id).localeCompare(String(filter._id.$gt)) <= 0
          ) {
            return false;
          }
          return true;
        })
      );
    });

    vi.spyOn(Order, "updateOne").mockImplementation(
      async (filter, operation, options) => {
        expect(options).toEqual({ runValidators: true });
        const target = ordersStore.find(
          (order) =>
            String(order._id) === String(filter._id) &&
            order.channel === filter.channel &&
            order.orderStatus === filter.orderStatus &&
            order.paymentStatus === filter.paymentStatus &&
            order.creationState !== filter.creationState?.$ne
        );

        if (!target) {
          return { modifiedCount: 0 };
        }

        Object.assign(target, operation.$set);
        if (operation.$push?.statusHistory) {
          target.statusHistory = [
            ...(target.statusHistory || []),
            operation.$push.statusHistory,
          ];
        }
        return { modifiedCount: 1 };
      }
    );
  }

  beforeEach(() => {
    ordersStore = [];
    installOrderStoreMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Domain rules & 72-hour boundaries (US1)", () => {
    it("resolves shipped timestamp from latest shipping entry and falls back to updatedAt/createdAt", () => {
      const shippedAt = new Date(now.getTime() - 75 * HOUR_MS);
      expect(
        resolveShippingStartedAt({
          statusHistory: [
            { to: "pending", at: new Date(now.getTime() - 96 * HOUR_MS) },
            { from: "processing", to: "shipping", at: shippedAt },
          ],
        })?.toISOString()
      ).toBe(shippedAt.toISOString());

      const updatedFallback = new Date(now.getTime() - 80 * HOUR_MS);
      expect(
        resolveShippingStartedAt({
          statusHistory: [{ to: "pending", at: new Date(now.getTime() - 100 * HOUR_MS) }],
          updatedAt: updatedFallback,
        })?.toISOString()
      ).toBe(updatedFallback.toISOString());
    });

    it("completes exactly at >= 72h, keeps < 72h untouched, marks COD paid, and preserves ONLINE paid status", async () => {
      const createdOld = new Date(now.getTime() - 100 * HOUR_MS);
      const exact72h = new Date(now.getTime() - AUTO_COMPLETE_AFTER_MS);
      const under72h = new Date(now.getTime() - (AUTO_COMPLETE_AFTER_MS - 1000));

      ordersStore.push(
        {
          _id: makeId(1),
          orderCode: "ORD261112001",
          customerId,
          channel: "online",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "COD",
          paymentStatus: "unpaid",
          createdAt: createdOld,
          statusHistory: [{ from: "processing", to: "shipping", by: staffId, at: exact72h }],
        },
        {
          _id: makeId(2),
          orderCode: "ORD261112002",
          customerId,
          channel: "online",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "ONLINE",
          paymentStatus: "paid",
          createdAt: createdOld,
          statusHistory: [
            { from: "processing", to: "shipping", by: staffId, at: new Date(now.getTime() - 90 * HOUR_MS) },
          ],
        },
        {
          _id: makeId(3),
          orderCode: "ORD261112003",
          customerId,
          channel: "online",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "COD",
          paymentStatus: "unpaid",
          createdAt: createdOld,
          statusHistory: [{ from: "processing", to: "shipping", by: staffId, at: under72h }],
        },
        {
          _id: makeId(4),
          orderCode: "ORD261112004",
          customerId,
          channel: "online",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "COD",
          paymentStatus: "unpaid",
          createdAt: createdOld,
          updatedAt: new Date(now.getTime() - 80 * HOUR_MS),
          statusHistory: [],
        }
      );

      for (const status of ["pending", "confirmed", "processing", "completed", "cancelled"]) {
        ordersStore.push({
          _id: makeId(10 + ordersStore.length),
          orderCode: `ORD_${status}`,
          channel: "online",
          creationState: "complete",
          orderStatus: status,
          paymentMethod: "COD",
          paymentStatus: status === "completed" ? "paid" : "unpaid",
          createdAt: createdOld,
          statusHistory: [{ to: status, at: createdOld }],
        });
      }

      const summary = await autoCompleteOverdueShippingOrders({ now });

      expect(summary).toEqual({
        checkedCount: 4,
        completedCount: 3,
        conflictCount: 0,
      });

      // Order 1: COD unpaid -> completed + paid + system history without `by`
      expect(ordersStore[0].orderStatus).toBe("completed");
      expect(ordersStore[0].paymentStatus).toBe("paid");
      expect(ordersStore[0].statusHistory.at(-1)).toEqual({
        from: "shipping",
        to: "completed",
        actorType: "system",
        at: now,
      });
      expect(ordersStore[0].statusHistory.at(-1).by).toBeUndefined();

      // Order 2: ONLINE paid -> completed + stays paid
      expect(ordersStore[1].orderStatus).toBe("completed");
      expect(ordersStore[1].paymentStatus).toBe("paid");

      // Order 3: 71h 59m 59s -> stays shipping & unpaid
      expect(ordersStore[2].orderStatus).toBe("shipping");
      expect(ordersStore[2].paymentStatus).toBe("unpaid");

      // Order 4: legacy missing shipping history -> completed via updatedAt fallback
      expect(ordersStore[3].orderStatus).toBe("completed");
      expect(ordersStore[3].paymentStatus).toBe("paid");

      // Non-shipping orders remain untouched
      expect(ordersStore.slice(4).map((o) => o.orderStatus)).toEqual([
        "pending",
        "confirmed",
        "processing",
        "completed",
        "cancelled",
      ]);
    });
  });

  describe("Scope, cursor pagination & concurrency (US2)", () => {
    it("completes guest & needsReview orders, excludes offline/pending-creation, and advances _id cursor across mixed batches", async () => {
      const createdOld = new Date(now.getTime() - 120 * HOUR_MS);
      const recentShip = new Date(now.getTime() - 24 * HOUR_MS);
      const overdueShip = new Date(now.getTime() - 75 * HOUR_MS);

      ordersStore.push(
        // Batch 1 contains ineligible (recent ship) and offline (filtered out)
        {
          _id: makeId(1),
          orderCode: "ORD_RECENT_1",
          customerId,
          channel: "online",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "COD",
          paymentStatus: "unpaid",
          createdAt: createdOld,
          statusHistory: [{ from: "processing", to: "shipping", at: recentShip }],
        },
        {
          _id: makeId(2),
          orderCode: "ORD_RECENT_2",
          customerId,
          channel: "online",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "COD",
          paymentStatus: "unpaid",
          createdAt: createdOld,
          statusHistory: [{ from: "processing", to: "shipping", at: recentShip }],
        },
        // Batch 2 contains guest order & needsReview overdue order
        {
          _id: makeId(3),
          orderCode: "ORD_GUEST",
          customerId: undefined,
          channel: "online",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "COD",
          paymentStatus: "unpaid",
          createdAt: createdOld,
          statusHistory: [{ from: "processing", to: "shipping", at: overdueShip }],
        },
        {
          _id: makeId(4),
          orderCode: "ORD_NEEDS_REVIEW",
          customerId,
          needsReview: true,
          channel: "online",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "ONLINE",
          paymentStatus: "paid",
          createdAt: createdOld,
          statusHistory: [{ from: "processing", to: "shipping", at: overdueShip }],
        },
        // Excluded offline & pending-creation orders
        {
          _id: makeId(5),
          orderCode: "ORD_OFFLINE",
          channel: "offline",
          creationState: "complete",
          orderStatus: "shipping",
          paymentMethod: "CASH",
          paymentStatus: "paid",
          createdAt: createdOld,
          statusHistory: [{ to: "shipping", at: overdueShip }],
        },
        {
          _id: makeId(6),
          orderCode: "ORD_CREATION_PENDING",
          channel: "online",
          creationState: "pending",
          orderStatus: "shipping",
          paymentMethod: "COD",
          paymentStatus: "unpaid",
          createdAt: createdOld,
          statusHistory: [{ to: "shipping", at: overdueShip }],
        }
      );

      const summary = await autoCompleteOverdueShippingOrders({
        now,
        batchSize: 2,
      });

      expect(summary).toEqual({
        checkedCount: 4,
        completedCount: 2,
        conflictCount: 0,
      });
      expect(ordersStore[2].orderStatus).toBe("completed");
      expect(ordersStore[2].paymentStatus).toBe("paid");
      expect(ordersStore[3].orderStatus).toBe("completed");
      expect(ordersStore[4].orderStatus).toBe("shipping");
      expect(ordersStore[5].orderStatus).toBe("shipping");
    });

    it("prevents duplicate completed history when customer confirms receipt simultaneously", async () => {
      const overdueShip = new Date(now.getTime() - 80 * HOUR_MS);
      ordersStore.push({
        _id: makeId(1),
        orderCode: "ORD_RACE",
        customerId,
        channel: "online",
        creationState: "complete",
        orderStatus: "shipping",
        paymentMethod: "COD",
        paymentStatus: "unpaid",
        createdAt: new Date(now.getTime() - 90 * HOUR_MS),
        statusHistory: [{ from: "processing", to: "shipping", by: staffId, at: overdueShip }],
      });

      // Simulate customer confirming receipt right before Order.updateOne executes
      const realImpl = Order.updateOne.getMockImplementation();
      Order.updateOne.mockImplementationOnce(async (filter, operation, options) => {
        ordersStore[0].orderStatus = "completed";
        ordersStore[0].paymentStatus = "paid";
        ordersStore[0].statusHistory.push({
          from: "shipping",
          to: "completed",
          by: customerId,
          at: new Date(),
        });
        return realImpl(filter, operation, options);
      });

      const summary = await autoCompleteOverdueShippingOrders({ now });

      expect(summary).toEqual({
        checkedCount: 1,
        completedCount: 0,
        conflictCount: 1,
      });
      expect(
        ordersStore[0].statusHistory.filter((h) => h.to === "completed")
      ).toHaveLength(1);
      expect(ordersStore[0].statusHistory.at(-1).by).toBe(customerId);
    });
  });

  describe("Scheduler lifecycle & Staff history visibility (US3)", () => {
    it("runs startup catch-up sweep, avoids overlapping runs, isolates errors, and stops cleanly", async () => {
      vi.useFakeTimers();
      try {
        let resolveFirstSweep;
        const firstSweepGate = new Promise((resolve) => {
          resolveFirstSweep = resolve;
        });

        let findCallCount = 0;
        Order.find.mockImplementation(() => {
          findCallCount += 1;
          return {
            select() {
              return this;
            },
            sort() {
              return this;
            },
            limit() {
              return this;
            },
            async lean() {
              if (findCallCount === 1) {
                await firstSweepGate;
              }
              return [];
            },
          };
        });

        const errors = [];
        const scheduler = startOrderAutoCompleteScheduler({
          intervalMs: 60_000,
          onError: (err) => errors.push(err),
        });

        // Startup runNow() is immediately active; invoking runNow() again reuses the mutex
        const duplicatePromise = scheduler.runNow();
        expect(findCallCount).toBe(1);

        resolveFirstSweep();
        await duplicatePromise;

        // Trigger error on interval tick and ensure scheduler stays alive without throwing
        Order.find.mockImplementationOnce(() => {
          throw new Error("Transient DB error");
        });
        await vi.advanceTimersByTimeAsync(60_000);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe("Transient DB error");

        await scheduler.stop();
        const afterStopCalls = findCallCount;
        await vi.advanceTimersByTimeAsync(180_000);
        expect(findCallCount).toBe(afterStopCalls);
        expect(await scheduler.runNow()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("maps system auto-complete statusHistory entry to readable Staff actorName without modifying Customer UI", async () => {
      const app = createApp(parseEnvironment({ NODE_ENV: "test" }));
      vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue({
        verifySessionCookie: vi.fn().mockResolvedValue({ uid: "staff-uid" }),
      });
      vi.spyOn(userRepository, "findByUid").mockResolvedValue({
        _id: staffId,
        role: "staff",
        fullName: "Nhan vien kho",
      });
      vi.spyOn(Product, "find").mockReturnValue({ lean: async () => [] });
      vi.spyOn(User, "find").mockReturnValue({
        select() {
          return this;
        },
        lean: async () => [{ _id: staffId, fullName: "Nhan vien kho" }],
      });

      const autoOrder = {
        _id: makeId(9),
        orderCode: "ORD261112999",
        channel: "online",
        creationState: "complete",
        orderStatus: "completed",
        paymentMethod: "COD",
        paymentStatus: "paid",
        subtotal: 200000,
        discount: 0,
        shippingFee: 0,
        total: 200000,
        items: [
          {
            productId,
            variantSku: "SKU-1",
            name: "Do choi meo",
            unitPrice: 200000,
            qty: 1,
          },
        ],
        shippingAddress: {
          recipientName: "Khach hang A",
          phone: "0901234567",
          province: "HCM",
          district: "Q1",
          ward: "Ben Nghe",
          street: "1 Le Loi",
        },
        createdAt: new Date("2026-11-08T10:00:00.000Z"),
        statusHistory: [
          {
            from: "processing",
            to: "shipping",
            by: staffId,
            at: new Date("2026-11-09T10:00:00.000Z"),
          },
          {
            from: "shipping",
            to: "completed",
            actorType: "system",
            at: new Date("2026-11-12T10:00:00.000Z"),
          },
        ],
      };

      vi.spyOn(Order, "findById").mockReturnValue({
        lean: async () => autoOrder,
      });

      const res = await request(app)
        .get(`/api/v1/staff/orders/${autoOrder._id}`)
        .set("Cookie", "petly-session=valid")
        .expect(200);

      expect(res.body.data.order.statusHistory).toEqual([
        expect.objectContaining({
          from: "processing",
          to: "shipping",
          actorName: "Nhan vien kho",
        }),
        expect.objectContaining({
          from: "shipping",
          to: "completed",
          actorName: "Hệ thống (tự động hoàn thành sau 3 ngày)",
        }),
      ]);
      expect(isShippingOrderOverdue(autoOrder, now)).toBe(false);
    });
  });
});

