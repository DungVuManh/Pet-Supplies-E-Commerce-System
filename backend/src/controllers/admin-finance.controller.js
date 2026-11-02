import { AppError } from "../common/errors/app-error.js";
import { Order } from "../models/order.model.js";
import { parseFinanceSummaryQuery } from "../validators/admin-finance.validator.js";
import {
  visibleOrders,
  aggregate,
  safeNumber,
  mongoBucket,
} from "./staff-analytics.helpers.js";
import { DAY, localDate } from "../validators/staff-analytics.validator.js";

/**
 * GET /api/v1/admin/reports/finance/summary?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 *
 * Trả về toàn bộ dữ liệu tài chính từ MongoDB:
 *   1. 4 chỉ số KPI: Doanh thu gộp, Hoàn tiền, Doanh thu thuần, Chờ đối soát.
 *   2. Biểu đồ lũy kế doanh thu thuần theo ngày (chart).
 *   3. Thống kê đối soát theo các kênh thanh toán thực tế (paymentChannels: ONLINE, COD, CASH).
 */
export async function getFinanceSummary(request, response) {
  const { dateFrom, dateTo, start, end } = parseFinanceSummaryQuery(request.query);

  try {
    const [result] = await aggregate(Order, [
      // Stage 1: Lọc đơn hợp lệ trong kỳ
      {
        $match: {
          ...visibleOrders,
          createdAt: { $gte: start, $lt: end },
        },
      },
      // Stage 2: Tính song song các nhóm chỉ số, biểu đồ và kênh thanh toán bằng $facet
      {
        $facet: {
          // Doanh thu gộp: đơn hoàn thành + đã thanh toán
          gross: [
            { $match: { orderStatus: "completed", paymentStatus: "paid" } },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$total" },
                orders: { $sum: 1 },
              },
            },
          ],
          // Đơn đã thanh toán nhưng bị hủy (tiền cần hoàn)
          cancelledPaid: [
            { $match: { orderStatus: "cancelled", paymentStatus: "paid" } },
            {
              $group: {
                _id: null,
                amount: { $sum: "$total" },
                orders: { $sum: 1 },
              },
            },
          ],
          // Chờ đối soát 1: đơn ONLINE đang pending thanh toán, chưa hủy
          onlinePending: [
            {
              $match: {
                paymentMethod: "ONLINE",
                paymentStatus: "pending",
                orderStatus: { $ne: "cancelled" },
              },
            },
            {
              $group: {
                _id: null,
                amount: { $sum: "$total" },
                orders: { $sum: 1 },
              },
            },
          ],
          // Chờ đối soát 2: đơn COD đang giao hoặc đã giao nhưng chưa thu tiền
          codPending: [
            {
              $match: {
                paymentMethod: "COD",
                orderStatus: { $in: ["shipping", "completed"] },
                paymentStatus: { $in: ["unpaid", "pending"] },
              },
            },
            {
              $group: {
                _id: null,
                amount: { $sum: "$total" },
                orders: { $sum: 1 },
              },
            },
          ],
          // Doanh thu theo từng ngày (phục vụ biểu đồ lũy kế)
          dailyGross: [
            { $match: { orderStatus: "completed", paymentStatus: "paid" } },
            {
              $group: {
                _id: mongoBucket("$createdAt", "day"),
                value: { $sum: "$total" },
              },
            },
          ],
          // Hoàn tiền theo từng ngày
          dailyRefund: [
            { $match: { orderStatus: "cancelled", paymentStatus: "paid" } },
            {
              $group: {
                _id: mongoBucket("$createdAt", "day"),
                value: { $sum: "$total" },
              },
            },
          ],
          // Đối soát theo từng kênh thanh toán thực tế trong MongoDB
          byMethod: [
            {
              $group: {
                _id: "$paymentMethod",
                transactions: { $sum: 1 },
                income: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$orderStatus", "completed"] },
                          { $eq: ["$paymentStatus", "paid"] },
                        ],
                      },
                      "$total",
                      0,
                    ],
                  },
                },
                refund: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$orderStatus", "cancelled"] },
                          { $eq: ["$paymentStatus", "paid"] },
                        ],
                      },
                      "$total",
                      0,
                    ],
                  },
                },
                pending: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          {
                            $and: [
                              { $eq: ["$paymentMethod", "ONLINE"] },
                              { $eq: ["$paymentStatus", "pending"] },
                              { $ne: ["$orderStatus", "cancelled"] },
                            ],
                          },
                          {
                            $and: [
                              { $eq: ["$paymentMethod", "COD"] },
                              { $in: ["$orderStatus", ["shipping", "completed"]] },
                              { $in: ["$paymentStatus", ["unpaid", "pending"]] },
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    if (!result) {
      throw new Error("Empty aggregation result");
    }

    // 1. Tính toán 4 chỉ số KPI chính
    const grossRevenue = safeNumber(result.gross[0]?.revenue ?? 0);
    const grossOrders = safeNumber(result.gross[0]?.orders ?? 0);

    const cancelledPaidAmount = safeNumber(result.cancelledPaid[0]?.amount ?? 0);
    const cancelledPaidOrders = safeNumber(result.cancelledPaid[0]?.orders ?? 0);

    const onlinePendingAmount = safeNumber(result.onlinePending[0]?.amount ?? 0);
    const onlinePendingOrders = safeNumber(result.onlinePending[0]?.orders ?? 0);

    const codPendingCollectionAmount = safeNumber(result.codPending[0]?.amount ?? 0);
    const codPendingCollectionOrders = safeNumber(result.codPending[0]?.orders ?? 0);

    const pendingReconciliationAmount = onlinePendingAmount + codPendingCollectionAmount;
    const pendingReconciliationTransactions = onlinePendingOrders + codPendingCollectionOrders;

    const netRevenue = grossRevenue - cancelledPaidAmount;

    // 2. Tính toán chuỗi điểm biểu đồ lũy kế doanh thu thuần (đơn vị: triệu đồng)
    const dailyGrossMap = new Map((result.dailyGross || []).map((r) => [r._id, safeNumber(r.value)]));
    const dailyRefundMap = new Map((result.dailyRefund || []).map((r) => [r._id, safeNumber(r.value)]));

    let runningNet = 0;
    const chart = [];
    for (let time = +start; time < +end; time += DAY) {
      const dateStr = localDate(new Date(time));
      const dayGross = dailyGrossMap.get(dateStr) ?? 0;
      const dayRefund = dailyRefundMap.get(dateStr) ?? 0;
      runningNet += (dayGross - dayRefund);

      const label = `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
      const value = Math.round((runningNet / 1_000_000) * 100) / 100;
      chart.push({ label, value });
    }

    // 3. Tính toán bảng đối soát các kênh thanh toán thực tế trong MongoDB
    const methodMap = new Map((result.byMethod || []).map((m) => [m._id, m]));
    const channelDefinitions = [
      {
        id: "online",
        channel: "ONLINE",
        channelName: "Thanh toán trực tuyến",
        detailTitle: "Ví / Thẻ / Ngân hàng",
      },
      {
        id: "cod",
        channel: "COD",
        channelName: "Thu hộ",
        detailTitle: "Thanh toán khi nhận hàng",
      },
      {
        id: "cash",
        channel: "CASH",
        channelName: "Tiền mặt",
        detailTitle: "Thanh toán tại quầy",
      },
    ];

    const paymentChannels = channelDefinitions.map((def) => {
      const m = methodMap.get(def.channel);
      const income = safeNumber(m?.income ?? 0);
      const refund = safeNumber(m?.refund ?? 0);
      const transactions = safeNumber(m?.transactions ?? 0);
      const pending = safeNumber(m?.pending ?? 0);
      const net = income - refund;
      const status = pending > 0 ? "Chờ đối soát" : "Đã đối soát";

      return {
        id: def.id,
        channel: def.channel,
        channelName: def.channelName,
        detailTitle: def.detailTitle,
        income,
        refund,
        transactions,
        net,
        status,
      };
    });

    response.json({
      success: true,
      data: {
        period: { dateFrom, dateTo },
        grossRevenue,
        grossOrders,
        cancelledPaidAmount,
        cancelledPaidOrders,
        refunds: cancelledPaidAmount,
        refundTransactions: cancelledPaidOrders,
        netRevenue,
        onlinePendingAmount,
        onlinePendingOrders,
        codPendingCollectionAmount,
        codPendingCollectionOrders,
        pendingReconciliationAmount,
        pendingReconciliationTransactions,
        pendingReconciliation: pendingReconciliationAmount,
        pendingTransactions: pendingReconciliationTransactions,
        chart,
        paymentChannels,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Chưa thể đọc báo cáo tài chính. Vui lòng thử lại.",
      503,
      "FINANCE_REPORT_UNAVAILABLE",
    );
  }
}
