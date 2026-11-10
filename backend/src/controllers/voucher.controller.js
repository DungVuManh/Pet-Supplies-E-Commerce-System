import { AppError } from "../common/errors/app-error.js";
import { priceOrderItems } from "../common/order-pricing.js";
import { checkVoucher, voucherRefusalMessage } from "../common/voucher-redemption.js";
import { vietnamLastDate } from "../common/voucher-rules.js";
import { Promotion } from "../models/promotion.model.js";
import { publicVouchersQuerySchema, voucherQuoteSchema } from "../validators/voucher.validator.js";

/** What a code would take off these items. It reserves nothing; the order step decides for real. */
export async function quoteVoucher(request, response) {
 const parsed = voucherQuoteSchema.safeParse(request.body);
 if (!parsed.success) throw new AppError("Yêu cầu không hợp lệ.", 400, "VALIDATION_ERROR");
 const { code, items, phone } = parsed.data;

 const { subtotal } = await priceOrderItems(items);
 const check = await checkVoucher(code, { subtotal, customer: { userId: request.user?._id, phone } });
 if (!check.applies) throw new AppError(voucherRefusalMessage(check), 422, "VOUCHER_INVALID");

 response.set("Cache-Control", "no-store");
 response.json({
  success: true,
  data: { code: check.voucher.code, name: check.voucher.name ?? "", subtotal, discount: check.discount, total: subtotal - check.discount },
 });
}

/** Vouchers the storefront may advertise. Never includes usage figures. */
export async function listPublicVouchers(request, response) {
 const parsed = publicVouchersQuerySchema.safeParse(request.query);
 const limit = parsed.success ? parsed.data.limit : 100;

 // Chỉ lấy tất cả mã giảm giá có isActive: true trong MongoDB
 const vouchers = await Promotion.find({
  isActive: true,
 }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();

 response.set("Cache-Control", "no-store");
 response.json({
  success: true,
  data: {
   items: vouchers.map((voucher) => ({
    _id: voucher._id,
    code: voucher.code,
    name: voucher.name ?? "",
    type: voucher.type,
    value: voucher.value,
    maxDiscount: voucher.maxDiscount ?? null,
    minOrderAmount: voucher.minOrderAmount ?? 0,
    startAt: voucher.startAt,
    endAt: voucher.endAt,
    isActive: voucher.isActive,
    endDate: voucher.endAt ? vietnamLastDate(voucher.endAt) : "Không giới hạn",
    createdAt: voucher.createdAt,
    updatedAt: voucher.updatedAt,
   })),
  },
 });
}
