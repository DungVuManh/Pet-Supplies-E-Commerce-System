import { AppError } from "../common/errors/app-error.js";
import {
  computeCustomerVoucherState,
  formatCustomerVoucherItem,
  isStaleVoucher,
} from "../common/customer-voucher-helpers.js";
import { CustomerVoucher } from "../models/customer-voucher.model.js";
import { Promotion } from "../models/promotion.model.js";
import { PromotionRedemption } from "../models/promotion-redemption.model.js";
import {
  listCustomerVouchersQuerySchema,
  removeCustomerVoucherParamsSchema,
  saveCustomerVoucherSchema,
  syncCustomerVouchersSchema,
} from "../validators/customer-voucher.validator.js";

const MAX_WALLET_CAPACITY = 50;

/**
 * Clean up vouchers that have been expired or used for more than 30 days.
 */
async function cleanupStaleVouchers(userId, savedVouchers, redemptionMap, now = new Date()) {
  const staleIds = [];

  for (const item of savedVouchers) {
    const promotion = item.voucherId;
    const redemption = promotion ? redemptionMap.get(String(promotion._id)) : null;
    const state = computeCustomerVoucherState(promotion, redemption, now);

    if (isStaleVoucher(promotion, state, redemption?.createdAt, now)) {
      staleIds.push(item._id);
    }
  }

  if (staleIds.length > 0) {
    await CustomerVoucher.deleteMany({ _id: { $in: staleIds } }).catch((err) => {
      console.warn("[customer-vouchers] Failed to cleanup stale vouchers:", err.message);
    });
  }

  return new Set(staleIds.map((id) => String(id)));
}

/**
 * POST /api/v1/customer/vouchers
 * Save a voucher to the customer's wallet.
 */
export async function saveCustomerVoucher(request, response) {
  const parsed = saveCustomerVoucherSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError("Dữ liệu không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  const { code } = parsed.data;
  const userId = request.user._id;

  const promotion = await Promotion.findOne({ code }).lean();
  if (!promotion) {
    throw new AppError("Không tìm thấy mã giảm giá.", 404, "VOUCHER_NOT_FOUND");
  }

  // Check if already saved (idempotent)
  const existing = await CustomerVoucher.findOne({
    userId,
    voucherId: promotion._id,
  }).lean();

  if (existing) {
    const customerKey = `user:${userId}`;
    const activeRedemption = await PromotionRedemption.findOne({
      promotionId: promotion._id,
      customerKey,
      status: "active",
    }).lean();
    const state = computeCustomerVoucherState(promotion, activeRedemption, new Date());
    const item = formatCustomerVoucherItem(existing, promotion, state);
    return response.status(200).json({
      success: true,
      message: "Mã giảm giá đã có trong ví của bạn.",
      data: item,
    });
  }

  // Check wallet capacity (max 50)
  const activeCount = await CustomerVoucher.countDocuments({ userId });
  if (activeCount >= MAX_WALLET_CAPACITY) {
    throw new AppError(
      `Ví voucher đã đạt giới hạn tối đa ${MAX_WALLET_CAPACITY} mã. Vui lòng sử dụng hoặc xóa bớt mã cũ.`,
      400,
      "WALLET_CAPACITY_EXCEEDED"
    );
  }

  const customerKey = `user:${userId}`;
  const activeRedemption = await PromotionRedemption.findOne({
    promotionId: promotion._id,
    customerKey,
    status: "active",
  }).lean();

  const state = computeCustomerVoucherState(promotion, activeRedemption, new Date());

  const newSavedVoucher = await CustomerVoucher.create({
    userId,
    voucherId: promotion._id,
    code: promotion.code,
    savedAt: new Date(),
  });

  const item = formatCustomerVoucherItem(newSavedVoucher, promotion, state);

  return response.status(201).json({
    success: true,
    message: "Đã lưu mã giảm giá vào ví!",
    data: item,
  });
}

/**
 * DELETE /api/v1/customer/vouchers/:code
 * Remove a voucher from the customer's wallet (Disallowed: one-way save rule).
 */
export async function removeCustomerVoucher(request, response) {
  return response.status(400).json({
    success: false,
    message: "Mã giảm giá đã lưu không thể hủy bỏ. Thao tác lưu chỉ được thực hiện 1 lần duy nhất.",
    error: {
      code: "VOUCHER_CANNOT_BE_UNSAVED",
    },
  });
}

/**
 * GET /api/v1/customer/vouchers/ids
 * Get list of saved codes for fast UI state rendering across the storefront.
 */
export async function getSavedVoucherCodes(request, response) {
  const userId = request.user._id;

  const savedList = await CustomerVoucher.find({ userId }).select("code").lean();
  const savedCodes = savedList.map((item) => item.code);

  return response.status(200).json({
    success: true,
    data: { savedCodes },
  });
}

/**
 * POST /api/v1/customer/vouchers/sync
 * Sync guest vouchers from local storage to account upon login.
 */
export async function syncCustomerVouchers(request, response) {
  const parsed = syncCustomerVouchersSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError("Dữ liệu đồng bộ không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  const { codes } = parsed.data;
  const userId = request.user._id;

  const promotions = await Promotion.find({ code: { $in: codes } }).lean();
  if (promotions.length === 0) {
    return response.status(200).json({
      success: true,
      message: "Không có mã giảm giá nào để đồng bộ.",
      data: { syncedCount: 0 },
    });
  }

  const currentCount = await CustomerVoucher.countDocuments({ userId });
  let availableSlots = Math.max(0, MAX_WALLET_CAPACITY - currentCount);

  let syncedCount = 0;
  for (const promo of promotions) {
    if (availableSlots <= 0) break;

    const res = await CustomerVoucher.updateOne(
      { userId, voucherId: promo._id },
      {
        $setOnInsert: {
          userId,
          voucherId: promo._id,
          code: promo.code,
          savedAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (res.upsertedCount > 0) {
      syncedCount += 1;
      availableSlots -= 1;
    }
  }

  return response.status(200).json({
    success: true,
    message: "Đã đồng bộ mã giảm giá thành công.",
    data: { syncedCount },
  });
}

/**
 * GET /api/v1/customer/vouchers
 * List saved vouchers in customer's wallet with dynamic state computation.
 */
export async function listCustomerVouchers(request, response) {
  const parsed = listCustomerVouchersQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError("Tham số không hợp lệ.", 400, "VALIDATION_ERROR");
  }
  const { status, page, limit, subtotal } = parsed.data;
  const userId = request.user._id;
  const now = new Date();

  // Find all saved vouchers for user
  const savedVouchers = await CustomerVoucher.find({ userId })
    .sort({ savedAt: -1 })
    .populate("voucherId")
    .lean();

  // Find all active redemptions for this user
  const customerKey = `user:${userId}`;
  const redemptions = await PromotionRedemption.find({
    customerKey,
    status: "active",
  }).lean();

  const redemptionMap = new Map();
  for (const r of redemptions) {
    redemptionMap.set(String(r.promotionId), r);
  }

  // Cleanup stale vouchers (> 30 days)
  const staleIdSet = await cleanupStaleVouchers(userId, savedVouchers, redemptionMap, now);

  const formattedItems = [];
  const counts = { all: 0, ready: 0, used: 0, expired: 0 };

  for (const item of savedVouchers) {
    if (staleIdSet.has(String(item._id))) {
      continue;
    }

    const promotion = item.voucherId;
    if (!promotion) {
      // Promotion was deleted from database
      continue;
    }

    const activeRedemption = redemptionMap.get(String(promotion._id));
    const state = computeCustomerVoucherState(promotion, activeRedemption, now);

    counts.all += 1;
    if (state === "ready") counts.ready += 1;
    else if (state === "used") counts.used += 1;
    else if (state === "expired") counts.expired += 1;

    if (status === "all" || status === state) {
      formattedItems.push(formatCustomerVoucherItem(item, promotion, state, subtotal));
    }
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const pagedItems = formattedItems.slice(startIndex, startIndex + limit);

  return response.status(200).json({
    success: true,
    data: {
      items: pagedItems,
      counts,
      pagination: {
        page,
        limit,
        total: formattedItems.length,
      },
    },
  });
}
