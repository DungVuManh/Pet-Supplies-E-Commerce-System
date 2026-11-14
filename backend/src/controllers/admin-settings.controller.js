import { Setting } from "../models/setting.model.js";
import { recordAudit } from "../common/audit.js";
import { parseUpdateStoreSettings } from "../validators/admin-settings.validator.js";

/**
 * Maps a Setting mongoose document / lean object directly to the StoreSettings contract.
 * Returns only the actual values stored in MongoDB.
 */
function toStoreSettingsDto(doc) {
  return {
    storeName: doc?.storeName ?? "",
    contactEmail: doc?.contactEmail ?? "",
    hotline: doc?.hotline ?? "",
    address: doc?.address ?? "",
    timezone: doc?.timezone ?? "GMT+7 · Việt Nam",
    currency: doc?.currency ?? "VND – Việt Nam đồng",
    standardShipping: Boolean(doc?.standardShipping ?? true),
    expressShipping: Boolean(doc?.expressShipping ?? false),
    freeShippingThreshold: Number(doc?.freeShippingThreshold ?? 0),
    codPayment: Boolean(doc?.codPayment ?? true),
    bankTransfer: Boolean(doc?.bankTransfer ?? false),
    vnpay: Boolean(doc?.vnpay ?? false),
    accountHolder: doc?.accountHolder ?? "",
    emailOrderConfirmation: Boolean(doc?.emailOrderConfirmation ?? true),
    lowStockAlert: Boolean(doc?.lowStockAlert ?? true),
    dailyRevenueReport: Boolean(doc?.dailyRevenueReport ?? false),
    promoNotification: Boolean(doc?.promoNotification ?? false),
    lowStockThreshold: Number(doc?.lowStockThreshold ?? 5),
    shippingFee: Number(doc?.shippingFee ?? 0),
    updatedAt: doc?.updatedAt,
  };
}

/**
 * GET /api/v1/admin/settings
 * Lấy cấu hình hệ thống thực tế từ MongoDB
 */
export async function getStoreSettings(request, response) {
  let doc = await Setting.findById("global").lean();
  if (!doc) {
    const created = await Setting.create({ _id: "global" });
    doc = created.toObject();
  }

  return response.status(200).json({
    success: true,
    data: toStoreSettingsDto(doc),
  });
}

/**
 * PUT /api/v1/admin/settings
 * Cập nhật cấu hình hệ thống trực tiếp vào MongoDB
 */
export async function updateStoreSettings(request, response) {
  const payload = parseUpdateStoreSettings(request.body);

  const beforeDoc = await Setting.findById("global").lean();

  const updatedDoc = await Setting.findByIdAndUpdate(
    "global",
    {
      $set: {
        storeName: payload.storeName,
        contactEmail: payload.contactEmail,
        hotline: payload.hotline,
        address: payload.address,
        timezone: payload.timezone,
        currency: payload.currency,
        standardShipping: payload.standardShipping,
        expressShipping: payload.expressShipping,
        freeShippingThreshold: payload.freeShippingThreshold,
        codPayment: payload.codPayment,
        bankTransfer: payload.bankTransfer,
        vnpay: payload.vnpay,
        accountHolder: payload.accountHolder,
        emailOrderConfirmation: payload.emailOrderConfirmation,
        lowStockAlert: payload.lowStockAlert,
        dailyRevenueReport: payload.dailyRevenueReport,
        promoNotification: payload.promoNotification,
      },
    },
    { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  await recordAudit(request, {
    action: "setting.update",
    target: { collectionName: "settings", id: "global" },
    before: beforeDoc ? toStoreSettingsDto(beforeDoc) : undefined,
    after: toStoreSettingsDto(updatedDoc),
    summary: `Cập nhật cấu hình cửa hàng: ${payload.storeName}`,
  });

  return response.status(200).json({
    success: true,
    message: "Đã lưu cấu hình hệ thống thành công.",
    data: toStoreSettingsDto(updatedDoc),
  });
}
