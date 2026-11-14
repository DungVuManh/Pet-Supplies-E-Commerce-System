import { AppError } from "../../common/errors/app-error.js";
import { pageDto } from "../../common/pagination.js";
import { searchFilter } from "../../common/search.js";
import { AuditLog } from "../../models/audit-log.model.js";
import { User } from "../../models/user.model.js";
import { parseQuery } from "../../validators/admin/list-query.js";
import { auditLogListQuerySchema } from "../../validators/admin/audit-log.validator.js";

export const ACTION_LABELS = {
  "order.create.offline": "Nhân viên tạo đơn hàng offline",
  "product.update": "Cập nhật sản phẩm",
  "product.create": "Tạo sản phẩm",
  "product.delete": "Xóa sản phẩm",
  "product.hide": "Ẩn sản phẩm",
  "product.show": "Hiện sản phẩm",
  "product.export": "Xuất danh sách sản phẩm",
  "user.lock": "Khóa tài khoản",
  "user.unlock": "Mở khóa tài khoản",
  "user.update": "Cập nhật người dùng",
  "user.create": "Tạo người dùng",
  "category.create": "Tạo danh mục",
  "category.update": "Cập nhật danh mục",
  "category.delete": "Xóa danh mục",
  "order.status": "Cập nhật đơn hàng",
  "order.export": "Xuất danh sách đơn hàng",
  "admin.cancellation.approve": "Duyệt yêu cầu hủy",
  "admin.cancellation.reject": "Từ chối yêu cầu hủy",
  "settings.update": "Cập nhật cấu hình",
  "setting.update": "Cập nhật cấu hình",
  "policy.publish": "Công bố chính sách",
  "policies.update": "Công bố chính sách",
  "admin.access": "Từ chối truy cập quản trị",
  "masterData.create": "Tạo dữ liệu danh mục",
  "masterData.update": "Cập nhật dữ liệu danh mục",
  "masterData.delete": "Xóa dữ liệu danh mục",
  "voucher.create": "Tạo mã giảm giá",
  "voucher.update": "Cập nhật mã giảm giá",
  "voucher.delete": "Xóa mã giảm giá",
  "voucher.enable": "Kích hoạt mã giảm giá",
  "voucher.disable": "Ngưng kích hoạt mã giảm giá",
  "seed.sample-data": "Khởi tạo dữ liệu mẫu",
};

export const ACTION_CODE_MAP = {
  "nhân viên tạo đơn hàng offline": ["order.create.offline"],
  "tạo đơn hàng offline": ["order.create.offline"],
  "cập nhật tồn kho": ["inventory.update", "stock.update", "product.update"],
  "cập nhật sản phẩm": ["product.update"],
  "khóa tài khoản": ["user.lock"],
  "mở khóa tài khoản": ["user.unlock"],
  "duyệt yêu cầu hủy": ["admin.cancellation.approve", "order.cancel.approve"],
  "từ chối yêu cầu hủy": ["admin.cancellation.reject"],
  "công bố chính sách": ["policy.publish", "policies.update", "policy.update"],
  "xóa sản phẩm": ["product.delete"],
  "cập nhật cấu hình": ["setting.update", "settings.update"],
  "truy cập quản trị": ["admin.access"],
  "từ chối truy cập quản trị": ["admin.access"],
  "xuất danh sách đơn hàng": ["order.export"],
  "xuất danh sách sản phẩm": ["product.export"],
};

/** Compute the destination link for a target resource in the admin dashboard */
export function auditTargetHref(collectionName, targetId) {
  const id = String(targetId || "").trim();
  const col = String(collectionName || "").toLowerCase().trim();

  if (col === "users" || /^(KH|NV)\d+$/i.test(id)) {
    return `/admin/users/${id}`;
  }
  if (col === "orders" || /^PA\d+$/i.test(id)) {
    return `/admin/orders?q=${id}`;
  }
  if (col === "policies" || id.startsWith("POL-")) {
    return "/admin/system/policies";
  }
  if (col === "settings" || id.startsWith("CFG-") || id === "store-settings" || id === "global") {
    return "/admin/system/settings";
  }
  if (col === "categories") {
    return "/admin/categories";
  }
  if (col === "masterdata") {
    return "/admin/master-data";
  }
  if (col === "vouchers" || col === "promotions") {
    return "/admin/vouchers";
  }
  if (col === "routes") {
    return "/admin/system/audit-log";
  }
  return `/admin/products/${id}`;
}

export function formatAuditTime(date) {
  if (!date) return { time: "—", fullTime: "—" };
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return { time: "—", fullTime: "—" };

  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(d).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

    const time = `${parts.day}/${parts.month} · ${parts.hour}:${parts.minute}`;
    const fullTime = `${parts.year} · ${parts.hour}:${parts.minute}:${parts.second}`;
    return { time, fullTime };
  } catch {
    const pad = (n) => String(n).padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return {
      time: `${day}/${month} · ${hours}:${minutes}`,
      fullTime: `${year} · ${hours}:${minutes}:${seconds}`,
    };
  }
}

export function getAuditSummary(log) {
  if (log.summary) return log.summary;
  if (log.action === "order.create.offline") {
    const code = log.after?.orderCode || log.target?.id || "";
    const total = log.after?.total ? ` (${Number(log.after.total).toLocaleString("vi-VN")} đ)` : "";
    return `Nhân viên tạo đơn hàng tại quầy ${code}${total}`.trim();
  }
  if (log.action === "admin.access") {
    return `Từ chối truy cập quản trị: ${log.target?.id || ""}`;
  }
  if (log.action === "setting.update" || log.action === "settings.update") {
    return "Cập nhật cấu hình cửa hàng";
  }
  if (log.action === "order.export") {
    return "Xuất danh sách đơn hàng ra file Excel/CSV";
  }
  if (log.action === "product.export") {
    return "Xuất danh sách sản phẩm ra file Excel/CSV";
  }
  return ACTION_LABELS[log.action] || log.action;
}

/** Formats a single audit log document for API response */
export function formatAuditLogRow(log) {
  const actorUser =
    log.actorId && typeof log.actorId === "object"
      ? log.actorId
      : null;

  const actorName =
    actorUser?.fullName || actorUser?.email || "Hệ thống";

  const actorRole = actorUser?.role || "system";
  const { time, fullTime } = formatAuditTime(log.at || log.createdAt);

  const targetId = String(log.target?.id || "").trim();
  const collectionName = String(
    log.target?.collectionName || ""
  ).toLowerCase();

  // Ưu tiên tên đối tượng đã lưu trong Audit Log
  let targetLabel = log.target?.label || targetId || "—";

  // Cấu hình hệ thống
  if (
    collectionName === "settings" ||
    targetId === "global" ||
    targetId === "store-settings"
  ) {
    targetLabel = "Cấu hình cửa hàng";
  }

  const detailSummary = getAuditSummary(log);

  return {
    id: String(log._id),
    at: log.at || log.createdAt,
    time,
    fullTime,
    actor: actorName,
    actorRole,
    actorEmail: actorUser?.email || "",
    actorPhone: actorUser?.phone || "",
    actorId: actorUser ? String(actorUser._id) : null,
    action: ACTION_LABELS[log.action] || log.action,
    actionCode: log.action,
    detail: detailSummary,
    summary: detailSummary,
    ip: log.ip || "—",
    target: targetLabel,
    targetId,
    targetCollection: collectionName,
    targetHref: auditTargetHref(collectionName, targetId),
    result: log.result === "denied" ? "Bị từ chối" : "Thành công",
    rawResult: log.result || "success",
    before: log.before ?? null,
    after: log.after ?? null,
  };
}

/**
 * Builds the MongoDB query filter for listing audit logs.
 */
export async function buildAuditLogFilter(query) {
  const conditions = [];

  // 1. Date range filter
  if (query.from) {
    const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(query.from)
      ? new Date(`${query.from}T00:00:00+07:00`)
      : new Date(query.from);
    if (!Number.isNaN(fromDate.getTime())) {
      conditions.push({ at: { $gte: fromDate } });
    }
  }

  if (query.to) {
    const toDate = /^\d{4}-\d{2}-\d{2}$/.test(query.to)
      ? new Date(`${query.to}T23:59:59.999+07:00`)
      : new Date(query.to);
    if (!Number.isNaN(toDate.getTime())) {
      conditions.push({ at: { $lte: toDate } });
    }
  }

  // 2. Action filter
  if (query.action && query.action !== "all" && query.action !== "Tất cả hành động") {
    const actionLower = query.action.toLowerCase().trim();
    const mappedCodes = ACTION_CODE_MAP[actionLower];
    if (mappedCodes) {
      conditions.push({ action: { $in: [query.action, ...mappedCodes] } });
    } else {
      conditions.push({ action: query.action });
    }
  }

  // 3. Result filter
  if (query.result && query.result !== "all") {
    if (query.result === "denied" || query.result === "Bị từ chối") {
      conditions.push({ result: "denied" });
    } else if (query.result === "success" || query.result === "Thành công") {
      conditions.push({ result: "success" });
    }
  }

  // 4. Keyword search (q)
  const q = String(query.q || "").trim();
  if (q) {
    const orClauses = [];

    // Search target.id and ip directly or with regex
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    orClauses.push({ "target.id": new RegExp(escaped, "i") });
    orClauses.push({ ip: new RegExp(escaped, "i") });

    // Search summary and action with searchFilter
    const textFilter = searchFilter(q, ["summary", "action"]);
    if (Object.keys(textFilter).length > 0) {
      orClauses.push(textFilter);
    }

    // Search actor users
    const userSearch = searchFilter(q, ["fullName", "email", "phone"]);
    if (Object.keys(userSearch).length > 0) {
      const matchedUsers = await User.find(userSearch).select("_id").lean();
      if (matchedUsers.length > 0) {
        orClauses.push({ actorId: { $in: matchedUsers.map((u) => u._id) } });
      }
    }

    conditions.push({ $or: orClauses });
  }

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
}

/**
 * GET /api/v1/admin/audit-logs
 * Read-only endpoint listing system audit logs with pagination and filters.
 */
export async function listAuditLogs(request, response) {
  const query = parseQuery(auditLogListQuerySchema, request.query);
  const filter = await buildAuditLogFilter(query);

  const { page, pageSize } = query;
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ at: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("actorId", "fullName role email")
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const paged = pageDto(items.map(formatAuditLogRow), total, query);

  response.json({
    success: true,
    data: paged,
  });
}

/**
 * GET /api/v1/admin/audit-logs/:id
 * Read-only endpoint returning detail of a single audit log entry.
 */
export async function getAuditLog(request, response) {
  const { id } = request.params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const log = isObjectId
    ? await AuditLog.findById(id).populate("actorId", "fullName role email phone").lean()
    : null;

  if (!log) {
    throw new AppError("Không tìm thấy bản ghi nhật ký hệ thống.", 404, "NOT_FOUND");
  }

  response.json({
    success: true,
    data: formatAuditLogRow(log),
  });
}
